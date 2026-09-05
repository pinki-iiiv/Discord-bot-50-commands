const { joinVoiceChannel } = require('@discordjs/voice');
const { voiceChannelId } = require('../config');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity('/help', { type: 0 });
    if (!voiceChannelId) return;
    const channel = await client.channels.fetch(voiceChannelId).catch(() => null);
    if (!channel?.isVoiceBased() || !channel.guild) return console.error('VOICE_CHANNEL must be a valid voice channel ID.');
    joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator, selfDeaf: true, selfMute: true });
  }
};
