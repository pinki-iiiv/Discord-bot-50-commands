const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getXp, setXp, getLeaderboard, auditLog } = require('../utils');
const { isStaff, isXpAdmin } = require('../auth');

function staffOnly(interaction) {
  return isStaff(interaction.member);
}

function adminOnly(interaction) {
  return isXpAdmin(interaction.member);
}

function levelForXp(xp) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function nextLevelXp(level) {
  return Math.pow(level, 2) * 100;
}

module.exports = [
  {
    data: new SlashCommandBuilder().setName('xp').setDescription('View a member XP').addUserOption(option => option.setName('user').setDescription('Member').setRequired(true)),
    async execute(interaction) {
      if (!staffOnly(interaction)) return interaction.reply({ content: 'Only the configured staff member can use this command.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const xp = getXp(interaction.guild.id, user.id);
      const level = levelForXp(xp);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`${user.username}'s XP`).addFields({ name: 'Total', value: `${xp} XP`, inline: true }, { name: 'Level', value: String(level), inline: true }, { name: 'Next level', value: `${nextLevelXp(level)} XP`, inline: true })] });
    }
  },
  {
    data: new SlashCommandBuilder().setName('xp-rank').setDescription('A').addUserOption(option => option.setName('user').setDescription('A').setRequired(false)),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const entries = getLeaderboard(interaction.guild.id);
      const rank = entries.findIndex(([userId]) => userId === user.id) + 1;
      const xp = getXp(interaction.guild.id, user.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`${user.username}'s rank`).setDescription(`${user} has ${xp} XP and is rank ${rank || 'unranked'}.`)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName('xpgive').setDescription('Give a member XP').addUserOption(option => option.setName('user').setDescription('Member').setRequired(true)).addIntegerOption(option => option.setName('amount').setDescription('XP amount').setRequired(true).setMinValue(1).setMaxValue(1000000)),
    async execute(interaction) {
      if (!adminOnly(interaction)) return interaction.reply({ content: 'Only the configured XP admin role can use this command.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const total = setXp(interaction.guild.id, user.id, getXp(interaction.guild.id, user.id) + amount);
      await auditLog(interaction.guild, 'XP granted', { Admin: interaction.user.tag, User: user.tag, Amount: amount, Total: total }, 0x2f9e44);
      return interaction.reply({ content: `${amount} XP added. ${user} now has ${total} XP.` });
    }
  },
  {
    data: new SlashCommandBuilder().setName('xpset').setDescription('Set a member XP').addUserOption(option => option.setName('user').setDescription('Member').setRequired(true)).addIntegerOption(option => option.setName('amount').setDescription('XP amount').setRequired(true).setMinValue(0).setMaxValue(100000000)),
    async execute(interaction) {
      if (!adminOnly(interaction)) return interaction.reply({ content: 'Only the configured XP admin role can use this command.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const total = setXp(interaction.guild.id, user.id, amount);
      await auditLog(interaction.guild, 'XP set', { Admin: interaction.user.tag, User: user.tag, Total: total }, 0x2f9e44);
      return interaction.reply({ content: `${user} is now set to ${total} XP.` });
    }
  },
  {
    data: new SlashCommandBuilder().setName('xpleaderboard').setDescription('View the XP leaderboard'),
    async execute(interaction) {
      const entries = getLeaderboard(interaction.guild.id).slice(0, 10);
      if (!entries.length) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('XP leaderboard').setDescription('No XP has been recorded yet.')] });
      const lines = await Promise.all(entries.map(async ([userId, amount], index) => { const user = await interaction.client.users.fetch(userId).catch(() => null); return `${index + 1}. ${user ? user.tag : userId} - ${amount} XP`; }));
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('XP leaderboard').setDescription(lines.join('\n'))] });
    }
  }
];
