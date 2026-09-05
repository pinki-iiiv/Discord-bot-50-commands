const fs = require('node:fs');
const path = require('node:path');
const {
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const { staffRoleId } = require('./config');
const { logChannelId } = require('./config');

const storePath = path.join(__dirname, 'data', 'store.json');

function readStore() {
  return JSON.parse(fs.readFileSync(storePath, 'utf8'));
}

function writeStore(store) {
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

function getGuildSettings(guildId) {
  const store = readStore();
  store.guilds[guildId] ??= {};
  writeStore(store);
  return store.guilds[guildId];
}

function updateGuildSettings(guildId, update) {
  const store = readStore();
  store.guilds[guildId] = { ...(store.guilds[guildId] || {}), ...update };
  writeStore(store);
  return store.guilds[guildId];
}

function getWarnings(guildId, userId) {
  const store = readStore();
  return store.warnings[guildId]?.[userId] || [];
}

function addWarning(guildId, userId, warning) {
  const store = readStore();
  store.warnings[guildId] ??= {};
  store.warnings[guildId][userId] ??= [];
  store.warnings[guildId][userId].push(warning);
  writeStore(store);
  return store.warnings[guildId][userId];
}

function clearWarnings(guildId, userId) {
  const store = readStore();
  if (store.warnings[guildId]) delete store.warnings[guildId][userId];
  writeStore(store);
}

function hasStaffPermission(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.ManageChannels);
}

function successEmbed(title, description) {
  return new EmbedBuilder().setColor(0x2f9e44).setTitle(title).setDescription(description);
}

function errorEmbed(description) {
  return new EmbedBuilder().setColor(0xc92a2a).setDescription(description);
}

async function auditLog(guild, title, details, color = 0x5865f2) {
  if (!logChannelId || !guild) return;
  const channel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  const fields = Object.entries(details || {}).slice(0, 25).map(([name, value]) => ({ name: String(name).slice(0, 256), value: String(value || 'Unknown').slice(0, 1024), inline: true }));
  await channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(title).addFields(fields)] }).catch(() => null);
}

async function replyError(interaction, description) {
  const payload = { embeds: [errorEmbed(description)], ephemeral: true };
  if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
  return interaction.reply(payload);
}

function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000) % 60;
  const minutes = Math.floor(milliseconds / 60000) % 60;
  const hours = Math.floor(milliseconds / 3600000) % 24;
  const days = Math.floor(milliseconds / 86400000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

async function createTicket(interaction) {
  const settings = getGuildSettings(interaction.guild.id);
  const category = interaction.values?.[0] || (interaction.customId.startsWith('ticket-category:') ? interaction.customId.slice('ticket-category:'.length) : 'general-help');
  const categoryNames = { 'report-member': 'report-member', 'general-help': 'general-help', 'other': 'other' };
  const categoryName = categoryNames[category] || categoryNames['general-help'];
  const baseName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18) || interaction.user.id.slice(-6);
  const existing = interaction.guild.channels.cache.find(channel => channel.name === `ticket-${baseName}` && channel.type === ChannelType.GuildText);
  if (existing) return interaction.reply({ content: `You already have an open ticket: ${existing}`, ephemeral: true });

  const staffRoleIds = staffRoleId ? [staffRoleId] : (settings.ticketStaffRoleIds || []);
  const overwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }
  ];
  for (const roleId of staffRoleIds) {
    overwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] });
  }
  const channel = await interaction.guild.channels.create({
    name: `ticket-${baseName}`,
    type: ChannelType.GuildText,
    parent: settings.ticketCategoryId || undefined,
    permissionOverwrites: overwrites,
    topic: `Ticket owner: ${interaction.user.id} | Type: ${categoryName}`
  });
  const controls = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket-claim').setLabel('Claim').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket-lock').setLabel('Lock').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket-close').setLabel('Close').setStyle(ButtonStyle.Danger)
  );
  const staffMention = staffRoleIds.map(roleId => `<@&${roleId}>`).join(' ');
  await channel.send({ content: `${staffMention} ${interaction.user} opened a ${categoryName.replace('-', ' ')} ticket.`, allowedMentions: { roles: staffRoleIds, users: [interaction.user.id] }, embeds: [new EmbedBuilder().setColor(0x2563eb).setTitle('Support ticket').addFields({ name: 'Category', value: categoryName.replace('-', ' ') }, { name: 'Opened by', value: `${interaction.user}` }).setDescription('A staff member will respond here. Claim the ticket to take responsibility, lock it to limit writing, or close it when finished.')], components: [controls] });
  return interaction.reply({ content: `Your ticket has been created: ${channel}`, ephemeral: true });
}

function ticketOwnerId(channel) {
  return channel.topic?.match(/Ticket owner: (\d+)/)?.[1] || null;
}

function getXp(guildId, userId) {
  const store = readStore();
  return store.xp?.[guildId]?.[userId] || 0;
}

function setXp(guildId, userId, amount) {
  const store = readStore();
  store.xp ??= {};
  store.xp[guildId] ??= {};
  store.xp[guildId][userId] = Math.max(0, Math.floor(amount));
  writeStore(store);
  return store.xp[guildId][userId];
}

function addXp(guildId, userId, amount) {
  return setXp(guildId, userId, getXp(guildId, userId) + amount);
}

function getMemberStats(guildId, userId) {
  const store = readStore();
  return store.stats?.[guildId]?.[userId] || { messages: 0, voiceSeconds: 0 };
}

function updateMemberStats(guildId, userId, update) {
  const store = readStore();
  store.stats ??= {};
  store.stats[guildId] ??= {};
  store.stats[guildId][userId] = { ...getMemberStats(guildId, userId), ...update };
  writeStore(store);
  return store.stats[guildId][userId];
}

function addMessageStat(guildId, userId) {
  const stats = getMemberStats(guildId, userId);
  return updateMemberStats(guildId, userId, { messages: stats.messages + 1 });
}

function addVoiceSeconds(guildId, userId, seconds) {
  const stats = getMemberStats(guildId, userId);
  return updateMemberStats(guildId, userId, { voiceSeconds: stats.voiceSeconds + Math.max(0, Math.floor(seconds)) });
}

function getLeaderboard(guildId) {
  const store = readStore();
  return Object.entries(store.xp?.[guildId] || {}).sort(([, first], [, second]) => second - first);
}

module.exports = {
  readStore,
  writeStore,
  getGuildSettings,
  updateGuildSettings,
  getWarnings,
  addWarning,
  clearWarnings,
  hasStaffPermission,
  successEmbed,
  errorEmbed,
  auditLog,
  replyError,
  formatDuration,
  createTicket,
  ticketOwnerId,
  getXp,
  setXp,
  addXp,
  getLeaderboard,
  getMemberStats,
  updateMemberStats,
  addMessageStat,
  addVoiceSeconds
};
