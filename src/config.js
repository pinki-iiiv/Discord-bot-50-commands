require('dotenv').config();

function environmentValue(name) {
  return String(process.env[name] || '').trim().replace(/^['"]|['"]$/g, '');
}

function discordId(name) {
  const value = environmentValue(name);
  return value.match(/\d{17,20}/)?.[0] || '';
}

module.exports = {
  token: environmentValue('DISCORD_TOKEN'),
  clientId: environmentValue('DISCORD_CLIENT_ID'),
  guildId: environmentValue('DISCORD_GUILD_ID'),
  weatherApiKey: environmentValue('WEATHER_API_KEY'),
  enableGuildMembersIntent: environmentValue('ENABLE_GUILD_MEMBERS_INTENT').toLowerCase() === 'true',
  enableMessageContentIntent: environmentValue('ENABLE_MESSAGE_CONTENT_INTENT').toLowerCase() === 'true',
  staffRoleId: discordId('STAFF_ROLE'),
  xpAdminRoleId: discordId('XP_PERMS'),
  logChannelId: discordId('LOG_CHANNEL'),
  voiceChannelId: discordId('VOICE_CHANNEL'),
  xpPerMessage: Math.max(0, Number(environmentValue('XP_PER_MESSAGE') || 1) || 0),
  xpCooldownSeconds: Math.max(0, Number(environmentValue('XP_COOLDOWN_SECONDS') || 5) || 0)
};
