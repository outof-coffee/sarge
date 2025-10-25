import { Client, GatewayIntentBits } from 'discord.js';
import { config as loadEnv } from 'dotenv';
import { EntityRegistry, repository } from '@outof-coffee/cordex';
import { BotConfig } from './config/bot-config.js';
import { GuildInfo, GuildFlag } from './entities/guild-info.js';
import { VERSION } from './version.js';
import * as manageCommand from './commands/manage.js';

async function main() {
  loadEnv();

  const discordToken = process.env.DISCORD_TOKEN;
  const databasePath = process.env.DATABASE_PATH || './data/bot-database.json';
  const managementGuildId = process.env.MANAGEMENT_GUILD_ID;
  const botId = process.env.BOT_ID;

  if (!discordToken) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }

  if (!managementGuildId) {
    throw new Error('MANAGEMENT_GUILD_ID environment variable is required');
  }

  const registry = new EntityRegistry();
  registry.register(BotConfig, () => 'app');
  registry.register(GuildInfo, () => 'app');

  await repository.initialize({
    databasePath,
    entityRegistry: registry
  });

  const existingConfigs = await repository.getAll(BotConfig, 'app');
  // TODO: Handle migrations if VERSION changes
  const config = existingConfigs.length > 0 ? existingConfigs[0] : new BotConfig(VERSION);

  if (existingConfigs.length === 0) {
    await repository.store(config);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildExpressions,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessageTyping,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildScheduledEvents,
      GatewayIntentBits.GuildMessagePolls,
      GatewayIntentBits.DirectMessagePolls,
    ]
  });

  client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user?.tag}`);
    console.log(`Bot version: ${config.version}`);

    try {
      const managementGuild = await client.guilds.fetch(managementGuildId);
      await managementGuild.commands.set([manageCommand.data.toJSON()]);
      console.log(`Registered commands to guild: ${managementGuild.name}`);
    } catch (error) {
      console.error(`Failed to register commands to guild ${managementGuildId}:`, error);
      console.warn('The bot may not have been added to the management guild yet.');
      console.warn(`Please add the bot to the guild using this URL:`);
      console.warn(`https://discord.com/oauth2/authorize?client_id=${botId}`);
    }

    const now = new Date();
    const guilds = client.guilds.cache;
    console.log(`Bot is in ${guilds.size} guild(s)`);

    for (const [guildId, guild] of guilds) {
      const existingGuildInfos = await repository.getAll(GuildInfo, 'app');
      const existingInfo = existingGuildInfos.find(g => g.guildId === guildId);

      const guildInfo = new GuildInfo(
        guildId,
        guild.name,
        existingInfo?.joinedAt ?? now,
        now,
        guild.memberCount,
        guild.ownerId,
        existingInfo?.flag ?? GuildFlag.Green
      );

      await repository.store(guildInfo);
      console.log(`Stored/updated guild info for: ${guild.name} (${guildId})`);
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
