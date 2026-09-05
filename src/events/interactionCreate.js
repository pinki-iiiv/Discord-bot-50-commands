const { PermissionFlagsBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { createTicket, ticketOwnerId, getGuildSettings, successEmbed, errorEmbed, auditLog } = require('../utils');
const { isStaff, commandAccess } = require('../auth');

const verifyCooldowns = new Map();
const verificationChallenges = new Map();

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => interaction.member) || interaction.member;
      if (!commandAccess(interaction.commandName, member)) {
        await auditLog(interaction.guild, 'Permission denied', { Command: `/${interaction.commandName}`, User: interaction.user.tag, UserId: interaction.user.id }, 0xc92a2a);
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      const optionText = interaction.options.data.map(option => `${option.name}: ${option.value ?? option.user?.id ?? option.role?.id ?? option.channel?.id ?? 'set'}`).join(', ');
      await auditLog(interaction.guild, 'Command used', { Command: `/${interaction.commandName}`, User: interaction.user.tag, UserId: interaction.user.id, Options: optionText || 'None' });
      try { await command.execute(interaction); } catch (error) { console.error(error); const payload = { content: 'The command could not be completed.', ephemeral: true }; if (interaction.replied || interaction.deferred) await interaction.followUp(payload); else await interaction.reply(payload); }
      return;
    }
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket-category') {
      await auditLog(interaction.guild, 'Ticket opened', { User: interaction.user.tag, UserId: interaction.user.id, Category: interaction.values[0] }, 0x2f9e44);
      return createTicket(interaction);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'verify-captcha') {
      const challenge = verificationChallenges.get(interaction.user.id);
      if (!challenge || challenge.expiresAt < Date.now()) return interaction.reply({ content: 'That verification challenge expired. Press the verify button again.', ephemeral: true });
      verificationChallenges.delete(interaction.user.id);
      if (interaction.fields.getTextInputValue('captcha-code').trim().toUpperCase() !== challenge.code) return interaction.reply({ embeds: [errorEmbed('The verification code was incorrect. Press the button to try again.')], ephemeral: true });
      const settings = getGuildSettings(interaction.guild.id);
      const verifiedRole = settings.verifiedRoleId ? interaction.guild.roles.cache.get(settings.verifiedRoleId) : null;
      if (!verifiedRole) return interaction.reply({ embeds: [errorEmbed('Verification has not been configured correctly.')], ephemeral: true });
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (verifiedRole.position >= interaction.guild.members.me.roles.highest.position) return interaction.reply({ embeds: [errorEmbed('The verified role is higher than the bot role.')], ephemeral: true });
      await member.roles.add(verifiedRole);
      if (settings.unverifiedRoleId) await member.roles.remove(settings.unverifiedRoleId).catch(() => null);
      return interaction.reply({ embeds: [successEmbed('Verification complete', `You now have the ${verifiedRole.name} role.`)], ephemeral: true });
    }

    if (!interaction.isButton()) return;

    if (interaction.customId === 'ticket-open') {
      await auditLog(interaction.guild, 'Ticket opened', { User: interaction.user.tag, UserId: interaction.user.id, Category: 'General help' }, 0x2f9e44);
      return createTicket(interaction);
    }
    if (interaction.customId === 'verify-user') {
      const lastAttempt = verifyCooldowns.get(interaction.user.id) || 0;
      if (Date.now() - lastAttempt < 10000) return interaction.reply({ content: 'Please wait before trying again.', ephemeral: true });
      verifyCooldowns.set(interaction.user.id, Date.now());
      const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const code = Array.from({ length: 6 }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
      verificationChallenges.set(interaction.user.id, { code, expiresAt: Date.now() + 120000 });
      const modal = new ModalBuilder().setCustomId('verify-captcha').setTitle('Server verification');
      const input = new TextInputBuilder().setCustomId('captcha-code').setLabel(`Enter this code: ${code}`).setStyle(TextInputStyle.Short).setMinLength(6).setMaxLength(6).setRequired(true).setPlaceholder('Type the six characters shown above');
      return interaction.showModal(modal.addComponents(new ActionRowBuilder().addComponents(input)));
    }
    if (interaction.customId.startsWith('self-role-')) {
      const roleId = interaction.customId.slice('self-role-'.length);
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role || role.position >= interaction.guild.members.me.roles.highest.position) return interaction.reply({ content: 'That role cannot be assigned by this bot.', ephemeral: true });
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (member.roles.cache.has(role.id)) { await member.roles.remove(role); return interaction.reply({ content: `${role.name} was removed from you.`, ephemeral: true }); }
      await member.roles.add(role);
      return interaction.reply({ content: `${role.name} was added to you.`, ephemeral: true });
    }
    if (!interaction.customId.startsWith('ticket-')) return;
    if (!interaction.channel?.name.startsWith('ticket-')) return interaction.reply({ content: 'This control is only available inside a ticket.', ephemeral: true });
    const ownerId = ticketOwnerId(interaction.channel);
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => interaction.member);
    const staff = isStaff(member);
    if (interaction.customId === 'ticket-close') {
      if (!staff && interaction.user.id !== ownerId) return interaction.reply({ content: 'Only the ticket owner or staff can close this ticket.', ephemeral: true });
      await interaction.reply({ content: 'This ticket will be closed.' });
      await auditLog(interaction.guild, 'Ticket closed', { Channel: interaction.channel.name, User: interaction.user.tag, UserId: interaction.user.id }, 0xc92a2a);
      return setTimeout(() => interaction.channel.delete('Ticket closed').catch(() => null), 3000);
    }
    if (!staff) return interaction.reply({ content: 'Only staff can use this control.', ephemeral: true });
    if (interaction.customId === 'ticket-claim') {
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      await auditLog(interaction.guild, 'Ticket claimed', { Channel: interaction.channel.name, Staff: interaction.user.tag, StaffId: interaction.user.id }, 0x2563eb);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2563eb).setDescription(`${interaction.user} claimed this ticket.`)] });
      const row = new ActionRowBuilder().addComponents(interaction.message.components[0].components.map(component => {
        const button = ButtonBuilder.from(component);
        if (button.data.custom_id === 'ticket-claim') button.setDisabled(true);
        return button;
      }));
      return interaction.message.edit({ components: [row] });
    }
    if (interaction.customId === 'ticket-lock') {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      for (const roleId of interaction.channel.permissionOverwrites.cache.filter(overwrite => overwrite.type === 0).keys()) {
        await interaction.channel.permissionOverwrites.edit(roleId, { SendMessages: false });
      }
      await interaction.channel.permissionOverwrites.edit(ownerId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      await auditLog(interaction.guild, 'Ticket locked', { Channel: interaction.channel.name, Staff: interaction.user.tag, StaffId: interaction.user.id }, 0xf59f00);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xf59f00).setDescription('This ticket is locked. Only the ticket creator and the staff member who locked it can write.')] });
    }
  }
};
