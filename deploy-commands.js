const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const { token, clientId } = require('./src/config');

if (!token || !clientId) throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID are required in .env');

const commands = [];
const commandDirectory = path.join(__dirname, 'src', 'commands');
for (const file of fs.readdirSync(commandDirectory).filter(file => file.endsWith('.js'))) {
  const loaded = require(path.join(commandDirectory, file));
  for (const command of Array.isArray(loaded) ? loaded : [loaded]) commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

function removeDescriptions(command) {
  command.description = command.name.replaceAll('-', ' ');
  for (const option of command.options || []) {
    option.description = option.name.replaceAll('-', ' ');
    for (const nestedOption of option.options || []) nestedOption.description = nestedOption.name.replaceAll('-', ' ');
    for (const choice of option.choices || []) choice.name = choice.name.slice(0, 100);
  }
  return command;
}

async function deploy() {
  const deployed = await rest.put(Routes.applicationCommands(clientId), { body: commands.map(removeDescriptions) });
  console.log(`Deployed ${deployed.length} global commands.`);
}

deploy().catch(console.error);
