const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { updateGuildSettings, getGuildSettings, successEmbed, errorEmbed } = require('../utils');

module.exports = [
  {
    data: new SlashCommandBuilder().setName('verify-setup').setDescription('Create the verification panel').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addRoleOption(o => o.setName('verified-role').setDescription('Role assigned after verification').setRequired(true)).addRoleOption(o => o.setName('unverified-role').setDescription('Role removed after verification')),
    async execute(interaction) { const verifiedRole = interaction.options.getRole('verified-role'); const unverifiedRole = interaction.options.getRole('unverified-role'); updateGuildSettings(interaction.guild.id, { verifiedRoleId: verifiedRole.id, unverifiedRoleId: unverifiedRole?.id || null }); const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify-user').setLabel('Accept rules / Verify').setStyle(ButtonStyle.Success)); await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0x2f9e44).setTitle('Member verification').setThumbnail('https://api.dicebear.com/9.x/bottts/png?seed=server-verification&backgroundColor=1f2937').setDescription('Read the rules, press the button, and enter the verification code shown to you. Verification is required before you can access the server.')], components: [row] }); return interaction.reply({ content: 'The verification panel has been created.', ephemeral: true }); }
  },
  {
    data: new SlashCommandBuilder().setName('role-info').setDescription('Show role details').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
    async execute(interaction) { const role = interaction.options.getRole('role'); return interaction.reply({ embeds: [new EmbedBuilder().setColor(role.color || 0x5865f2).setTitle(role.name).addFields({ name: 'Members', value: String(role.members.size), inline: true }, { name: 'Position', value: String(role.position), inline: true }, { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true })] }); }
  },
  {
    data: new SlashCommandBuilder().setName('autorole-set').setDescription('Set the role assigned to new members').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addRoleOption(o => o.setName('role').setDescription('Role; omit to disable').setRequired(false)),
    async execute(interaction) { const role = interaction.options.getRole('role'); updateGuildSettings(interaction.guild.id, { autoroleId: role?.id || null }); return interaction.reply({ embeds: [successEmbed('Autorole updated', role ? `New members will receive ${role}.` : 'Autorole has been disabled.')] }); }
  },
  {
    data: new SlashCommandBuilder().setName('reaction-role').setDescription('Create a role assignment button').setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)).addStringOption(o => o.setName('label').setDescription('Button label').setRequired(true).setMaxLength(80)),
    async execute(interaction) { const role = interaction.options.getRole('role'); const customId = `self-role-${role.id}`; const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(customId).setLabel(interaction.options.getString('label')).setStyle(ButtonStyle.Primary)); await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(role.color || 0x5865f2).setTitle('Choose your role').setDescription(`Press the button to toggle ${role}.`)], components: [row] }); return interaction.reply({ content: 'The role button has been created.', ephemeral: true }); }
  },
  {
    data: new SlashCommandBuilder().setName('members-with-role').setDescription('List members with a role').setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
    async execute(interaction) { const role = interaction.options.getRole('role'); const members = [...role.members.values()].slice(0, 50).map(member => member.user.tag); return interaction.reply({ embeds: [new EmbedBuilder().setColor(role.color || 0x5865f2).setTitle(`Members with ${role.name}`).setDescription(members.length ? members.join('\n') : 'No members have this role.').setFooter({ text: `${role.members.size} total member(s)` })] }); }
  }
];
