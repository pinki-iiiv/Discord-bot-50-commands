const { addVoiceSeconds, updateMemberStats, getMemberStats } = require('../utils');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    if (!oldState.channelId && newState.channelId) {
      updateMemberStats(member.guild.id, member.id, { voiceStartedAt: Date.now() });
      return;
    }
    if (oldState.channelId && !newState.channelId) {
      const stats = getMemberStats(member.guild.id, member.id);
      const startedAt = Number(stats.voiceStartedAt || Date.now());
      addVoiceSeconds(member.guild.id, member.id, (Date.now() - startedAt) / 1000);
      updateMemberStats(member.guild.id, member.id, { voiceStartedAt: null });
    }
  }
};