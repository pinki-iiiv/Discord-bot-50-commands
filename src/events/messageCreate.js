const { isStaff, isXpAdmin } = require('../auth');
const { getXp, setXp, addXp, getLeaderboard, auditLog, addMessageStat } = require('../utils');
const { xpPerMessage, xpCooldownSeconds } = require('../config');

const xpCooldowns = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    const stats = addMessageStat(message.guild.id, message.author.id);
    const cooldownKey = `${message.guild.id}:${message.author.id}`;
    const lastXp = xpCooldowns.get(cooldownKey) || 0;
    if (xpPerMessage > 0 && Date.now() - lastXp >= xpCooldownSeconds * 1000) {
      const amount = xpPerMessage;
      const total = addXp(message.guild.id, message.author.id, amount);
      await auditLog(message.guild, 'XP earned', { User: message.author.tag, UserId: message.author.id, Amount: amount, Total: total, Messages: stats.messages }, 0x2f9e44);
      xpCooldowns.set(cooldownKey, Date.now());
    }
    if (!message.content.startsWith('!')) return;
    const parts = message.content.trim().split(/\s+/);
    const command = parts.shift().toLowerCase();
    await auditLog(message.guild, 'Prefix command used', { Command: command, User: message.author.tag, UserId: message.author.id });
    if (command === '!xp') {
      if (!isStaff(message.member)) return message.reply('Only the configured staff member can use this command.');
      const userId = parts[0];
      if (!/^\d{17,20}$/.test(userId)) return message.reply('Usage: !xp userId');
      return message.reply(`<@${userId}> has ${getXp(message.guild.id, userId)} XP.`);
    }
    if (command === '!xpgive') {
      if (!isXpAdmin(message.member)) return message.reply('Only the configured XP admin role can use this command.');
      const userId = parts[0];
      const amount = Number(parts[1]);
      if (!/^\d{17,20}$/.test(userId) || !Number.isInteger(amount) || amount < 1 || amount > 1000000) return message.reply('Usage: !xpgive userId amount');
      const total = setXp(message.guild.id, userId, getXp(message.guild.id, userId) + amount);
      await auditLog(message.guild, 'XP granted', { Admin: message.author.tag, UserId: userId, Amount: amount, Total: total }, 0x2f9e44);
      return message.reply(`${amount} XP added. <@${userId}> now has ${total} XP.`);
    }
    if (command === '!xpset') {
      if (!isXpAdmin(message.member)) return message.reply('Only the configured XP admin role can use this command.');
      const userId = parts[0];
      const amount = Number(parts[1]);
      if (!/^\d{17,20}$/.test(userId) || !Number.isInteger(amount) || amount < 0 || amount > 100000000) return message.reply('Usage: !xpset userId amount');
      const total = setXp(message.guild.id, userId, amount);
      await auditLog(message.guild, 'XP set', { Admin: message.author.tag, UserId: userId, Total: total }, 0x2f9e44);
      return message.reply(`<@${userId}> is now set to ${total} XP.`);
    }
    if (command === '!xpleaderboard') {
      const leaderboard = getLeaderboard(message.guild.id).slice(0, 10);
      if (!leaderboard.length) return message.reply('No XP has been recorded yet.');
      return message.reply(leaderboard.map(([userId, amount], index) => `${index + 1}. <@${userId}> - ${amount} XP`).join('\n'));
    }
    if (command === '!xp-rank') {
      const userId = parts[0] || message.author.id;
      if (!/^\d{17,20}$/.test(userId)) return message.reply('Usage: !xp-rank userId');
      const rank = getLeaderboard(message.guild.id).findIndex(([id]) => id === userId) + 1;
      return message.reply(`<@${userId}> is rank ${rank || 'unranked'} with ${getXp(message.guild.id, userId)} XP.`);
    }
  }
};
