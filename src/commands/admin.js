const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const {
  getWarnings,
  addWarning,
  clearWarnings,
  updateGuildSettings,
  successEmbed,
  errorEmbed,
  auditLog
} = require('../utils');

const commands = [];

commands.push({
  data: new SlashCommandBuilder().setName('ban').setDescription('Ban a member').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addUserOption(o => o.setName('user').setDescription('Member to ban').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(500)),
  async execute(interaction) { const user = interaction.options.getUser('user'); const reason = interaction.options.getString('reason') || 'No reason provided'; const member = await interaction.guild.members.fetch(user.id).catch(() => null); if (!member || !member.bannable) return interaction.reply({ embeds: [errorEmbed('That member cannot be banned by this bot.')], ephemeral: true }); await member.ban({ reason }); return interaction.reply({ embeds: [successEmbed('Member banned', `${user.tag} was banned. Reason: ${reason}`)] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('kick').setDescription('Kick a member').setDefaultMemberPermissions(PermissionFlagsBits.KickMembers).addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(500)),
  async execute(interaction) { const user = interaction.options.getUser('user'); const reason = interaction.options.getString('reason') || 'No reason provided'; const member = await interaction.guild.members.fetch(user.id).catch(() => null); if (!member || !member.kickable) return interaction.reply({ embeds: [errorEmbed('That member cannot be kicked by this bot.')], ephemeral: true }); await member.kick(reason); return interaction.reply({ embeds: [successEmbed('Member kicked', `${user.tag} was kicked. Reason: ${reason}`)] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320)).addStringOption(o => o.setName('reason').setDescription('Reason')),
  async execute(interaction) { const member = await interaction.guild.members.fetch(interaction.options.getUser('user').id).catch(() => null); const minutes = interaction.options.getInteger('minutes'); if (!member || !member.moderatable) return interaction.reply({ embeds: [errorEmbed('That member cannot be timed out.')], ephemeral: true }); await member.timeout(minutes * 60000, interaction.options.getString('reason') || 'No reason provided'); return interaction.reply({ embeds: [successEmbed('Member timed out', `${member.user.tag} was timed out for ${minutes} minute(s).`)] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('untimeout').setDescription('Remove a member timeout').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),
  async execute(interaction) { const member = await interaction.guild.members.fetch(interaction.options.getUser('user').id).catch(() => null); if (!member || !member.moderatable) return interaction.reply({ embeds: [errorEmbed('That member cannot be modified.')], ephemeral: true }); await member.timeout(null); return interaction.reply({ embeds: [successEmbed('Timeout removed', `${member.user.tag} can speak again.`)] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('purge').setDescription('Delete recent messages').addIntegerOption(o => o.setName('amount').setDescription('Messages to delete').setRequired(true).setMinValue(1).setMaxValue(100)),
  async execute(interaction) { const amount = interaction.options.getInteger('amount'); const messages = await interaction.channel.bulkDelete(amount, true); await auditLog(interaction.guild, 'Messages purged', { Staff: interaction.user.tag, Channel: interaction.channel.name, Amount: messages.size }, 0xf59f00); const reply = await interaction.reply({ content: `Deleted ${messages.size} msgs`, fetchReply: true }); setTimeout(() => reply.delete().catch(() => null), 3000); }
});
commands.push({
  data: new SlashCommandBuilder().setName('lockdown').setDescription('Lock the current channel').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) { await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }); return interaction.reply({ embeds: [successEmbed('Channel locked', 'Members can no longer send messages here.')] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('unlock').setDescription('Unlock the current channel').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) { await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }); return interaction.reply({ embeds: [successEmbed('Channel unlocked', 'Members can send messages here again.')] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('slowmode').setDescription('Set channel slowmode').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).addIntegerOption(o => o.setName('seconds').setDescription('Delay in seconds').setRequired(true).setMinValue(0).setMaxValue(21600)),
  async execute(interaction) { const seconds = interaction.options.getInteger('seconds'); await interaction.channel.setRateLimitPerUser(seconds); return interaction.reply({ embeds: [successEmbed('Slowmode updated', `Slowmode is now ${seconds} second(s).`)] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('nick').setDescription('Change a member nickname').setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames).addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('nickname').setDescription('New nickname; omit to clear').setMaxLength(32)),
  async execute(interaction) { const member = await interaction.guild.members.fetch(interaction.options.getUser('user').id).catch(() => null); if (!member || !member.manageable) return interaction.reply({ embeds: [errorEmbed('That nickname cannot be changed.')], ephemeral: true }); await member.setNickname(interaction.options.getString('nickname')); return interaction.reply({ embeds: [successEmbed('Nickname updated', `${member.user.tag}'s nickname was updated.`)] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('role-add').setDescription('Add a role to a member').setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles).addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  async execute(interaction) { const member = await interaction.guild.members.fetch(interaction.options.getUser('user').id); const role = interaction.options.getRole('role'); if (role.position >= interaction.guild.members.me.roles.highest.position) return interaction.reply({ embeds: [errorEmbed('That role is higher than the bot role.')], ephemeral: true }); await member.roles.add(role); return interaction.reply({ embeds: [successEmbed('Role added', `${role} was added to ${member}.`)] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('role-remove').setDescription('Remove a role from a member').setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles).addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  async execute(interaction) { const member = await interaction.guild.members.fetch(interaction.options.getUser('user').id); const role = interaction.options.getRole('role'); await member.roles.remove(role); return interaction.reply({ embeds: [successEmbed('Role removed', `${role} was removed from ${member}.`)] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('warn').setDescription('Warn a member').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true).setMaxLength(500)),
  async execute(interaction) { const user = interaction.options.getUser('user'); const reason = interaction.options.getString('reason'); const warnings = addWarning(interaction.guild.id, user.id, { reason, moderatorId: interaction.user.id, createdAt: new Date().toISOString() }); await user.send(`You were warned in ${interaction.guild.name}: ${reason}`).catch(() => null); return interaction.reply({ embeds: [successEmbed('Warning issued', `${user.tag} now has ${warnings.length} warning(s).`)] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('warnings').setDescription('View member warnings').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),
  async execute(interaction) { const user = interaction.options.getUser('user'); const warnings = getWarnings(interaction.guild.id, user.id); const text = warnings.length ? warnings.map((warning, index) => `${index + 1}. ${warning.reason} (${new Date(warning.createdAt).toLocaleString()})`).join('\n') : 'No warnings recorded.'; return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xf59f00).setTitle(`Warnings for ${user.tag}`).setDescription(text)] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('clearwarns').setDescription('Clear member warnings').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),
  async execute(interaction) { const user = interaction.options.getUser('user'); clearWarnings(interaction.guild.id, user.id); return interaction.reply({ embeds: [successEmbed('Warnings cleared', `All warnings for ${user.tag} were removed.`)] }); }
});
commands.push({
  data: new SlashCommandBuilder().setName('ticket-setup').setDescription('Create the ticket panel').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addChannelOption(o => o.setName('category').setDescription('Ticket category').addChannelTypes(ChannelType.GuildCategory)).addRoleOption(o => o.setName('staff-role').setDescription('Staff role allowed in tickets')),
  async execute(interaction) { const category = interaction.options.getChannel('category'); const staffRole = interaction.options.getRole('staff-role'); updateGuildSettings(interaction.guild.id, { ticketCategoryId: category?.id || null, ticketStaffRoleIds: staffRole ? [staffRole.id] : [] }); const menu = new StringSelectMenuBuilder().setCustomId('ticket-category').setPlaceholder('Choose a ticket type').addOptions({ label: 'Report a member', value: 'report-member', description: 'Report a rule violation to staff' }, { label: 'General help', value: 'general-help', description: 'Ask the staff team for help' }, { label: 'Other', value: 'other', description: 'Something that does not fit the other options' }); const row = new ActionRowBuilder().addComponents(menu); await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0x2563eb).setTitle('Support tickets').setDescription('Choose the reason for your ticket. A private channel will be created for you.')], components: [row] }); return interaction.reply({ content: 'The ticket panel has been created.', ephemeral: true }); }
});

module.exports = commands;
