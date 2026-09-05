const { getGuildSettings } = require('../utils');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const settings = getGuildSettings(member.guild.id);
    if (!settings.autoroleId) return;
    const role = member.guild.roles.cache.get(settings.autoroleId);
    if (role && role.position < member.guild.members.me.roles.highest.position) await member.roles.add(role).catch(() => null);
  }
};
