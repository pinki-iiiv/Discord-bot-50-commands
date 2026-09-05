const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { token, enableGuildMembersIntent, enableMessageContentIntent } = require('./config');

if (!token) throw new Error('DISCORD_TOKEN is required in .env');

const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates];
if (enableGuildMembersIntent) intents.push(GatewayIntentBits.GuildMembers);
if (enableMessageContentIntent) intents.push(GatewayIntentBits.MessageContent);

const client = new Client({
  intents,
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});
client.commands = new Collection();

const commandDirectory = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandDirectory).filter(file => file.endsWith('.js'))) {
  const loaded = require(path.join(commandDirectory, file));
  for (const command of Array.isArray(loaded) ? loaded : [loaded]) client.commands.set(command.data.name, command);
}

const eventDirectory = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventDirectory).filter(file => file.endsWith('.js'))) {
  const event = require(path.join(eventDirectory, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}

client.login(token);
