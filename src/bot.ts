import { Client, GatewayIntentBits } from 'discord.js';
import { EntityRegistry, repository } from '@outof-coffee/cordex';
import { BotConfig } from './config/bot-config.js';
import { GuildInfo, GuildFlag } from './entities/guild-info.js';
import { VERSION } from './version.js';
import { EventManager } from './event-manager.js';
import { env } from 'process';
import { GuildManagement } from './commands/manage.js';

export class Bot {

  constructor() {
    const envDiscordToken = process.env.DISCORD_TOKEN;
    const envManagementGuildId = process.env.MANAGEMENT_GUILD_ID;
    const envBotId = process.env.BOT_ID;

    this.databasePath = process.env.DATABASE_PATH || './data/bot-database.json';

    if (!envDiscordToken) {
      throw new Error('DISCORD_TOKEN environment variable is required');
    }

    this.discordToken = envDiscordToken;

    if (!envManagementGuildId) {
      throw new Error('MANAGEMENT_GUILD_ID environment variable is required');
    }

    this.managementGuildId = envManagementGuildId;

    if (!envBotId) {
      throw new Error('BOT_ID environment variable is required');
    }

    this.botId = envBotId;

    this.client = new Client({
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

    this.registry = new EntityRegistry();
    this.guildManagement = new GuildManagement(this.managementGuildId, this.botId, this.eventManager); // intiializes and registers itself
  }

  public async initialize() {
    this.registry.register(BotConfig, () => 'app');
    this.registry.register(GuildInfo, () => 'app');
    this.isInitialized = true;
    const databasePath = this.databasePath;
    await repository.initialize({
      databasePath,
      entityRegistry: this.registry
    });

    const existingConfigs = await repository.getAll(BotConfig, 'app');
    // TODO: Handle migrations if VERSION changes
    const config = existingConfigs.length > 0 ? existingConfigs[0] : new BotConfig(VERSION);

    if (existingConfigs.length === 0) {
      await repository.store(config);
    }

    this.eventManager.attachHandlers(this.client);

    await this.client.login(this.discordToken);
  }

  // private members
  private discordToken: string;
  private databasePath: string;
  private managementGuildId: string;
  private botId: string;

  private client: Client;
  private registry: EntityRegistry;

  private eventManager: EventManager = EventManager.getInstance();

  private guildManagement: GuildManagement;

  public isInitialized: boolean = false;
}