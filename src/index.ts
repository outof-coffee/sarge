import { Client, GatewayIntentBits } from 'discord.js';
import { config as loadEnv } from 'dotenv';
import { EntityRegistry, repository } from '@outof-coffee/cordex';
import { BotConfig } from './config/bot-config.js';
import * as manageCommand from './commands/manage.js';

const VERSION = '0.0.1';

async function main() {
  loadEnv();

  const discordToken = process.env.DISCORD_TOKEN;
  const databasePath = process.env.DATABASE_PATH || './data/bot-database.json';
  const managementGuildId = process.env.MANAGEMENT_GUILD_ID;

  if (!discordToken) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }

  if (!managementGuildId) {
    throw new Error('MANAGEMENT_GUILD_ID environment variable is required');
  }

  const registry = new EntityRegistry();
  registry.register(BotConfig, () => 'app');

  await repository.initialize({
    databasePath,
    entityRegistry: registry
  });

  const existingConfigs = await repository.getAll(BotConfig, 'app');
  const config = existingConfigs.length > 0 ? existingConfigs[0] : new BotConfig(VERSION);

  if (existingConfigs.length === 0) {
    await repository.store(config);
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`);
    console.log(`Bot version: ${config.version}`);

    const managementGuild = client.guilds.cache.get(managementGuildId);
    if (managementGuild) {
      await managementGuild.commands.set([manageCommand.data.toJSON()]);
      console.log(`Registered commands to guild: ${managementGuild.name}`);
    } else {
      console.warn(`Could not find management guild with ID: ${managementGuildId}`);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'manage') {
      await manageCommand.execute(interaction, managementGuildId);
    }
  });

  await client.login(discordToken);
}

main().catch(console.error);
