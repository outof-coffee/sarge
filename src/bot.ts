import { Client, CommandInteraction, Events, GatewayIntentBits, Interaction } from 'discord.js';
import { EntityRegistry, repository } from '@outof-coffee/cordex';
import { BotConfig } from './config/bot-config.js';
import { GuildInfo } from './entities/guild-info.js';
import { VERSION } from './version.js';
import { EventManager } from './event-manager.js';
import { GuildManagement } from './commands/manage.js';
import { CommandHandler } from './command-handler.js';
import { GuildSargeConfig } from './entities/guild-sarge-config.js';
import { SargeCommand } from './commands/sarge.js';

export class Bot {

    constructor() {
        const envDiscordToken = process.env.DISCORD_TOKEN;
        const envManagementGuildId = process.env.MANAGEMENT_GUILD_ID;
        const envManagementGuildAdminUserId = process.env.MANAGEMENT_GUILD_ADMIN_USER_ID; // TODO: make this optional if a role id is provided instead
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

        if (!envManagementGuildAdminUserId) {
            throw new Error('MANAGEMENT_GUILD_ADMIN_USER_ID environment variable is required');
        }

        this.managementGuildAdminUserId = envManagementGuildAdminUserId;

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
    }

    public async initialize() {
        // TODO: find a way to discover this from the commands? maybe pass them into the registry somehow to discover?
        this.registry.register(BotConfig, () => 'app');
        this.registry.register(GuildInfo, () => 'app');
        this.registry.register(GuildSargeConfig, (entity) => entity.guildId);

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

        this.registerCommands();

        this.isInitialized = true;
    }

    public async run() {
        if (!this.isInitialized) {
            throw new Error('Bot must be initialized before running');
        }

        this.attachCommandHandlers();

        this.eventManager.attachHandlers(this.client);

        await this.client.login(this.discordToken);
    }

    // MARK: - Private methods
    private registerCommands() {
        const guildManagement = new GuildManagement(this.managementGuildId, this.botId, this.managementGuildAdminUserId); // needed as management-only command
        const sarge = new SargeCommand(this.managementGuildId, this.botId); // TODO: remove parameters when no longer needed
        this.commandHandlers.push(guildManagement);
        this.commandHandlers.push(sarge);
    }

    private attachCommandHandlers() {
        for (const handler of this.commandHandlers) {
            if (handler.registerCommandEvents) {
                handler.registerCommandEvents(this.eventManager);
            } else {
                // since we know it's a command, because it implements CommandHandler, we can register a default interaction handler, as long as the interaction implements CommandInteraction
                this.eventManager.registerHandler({
                    event: Events.InteractionCreate,
                    handle: async (interaction: Interaction) => {
                        if (!interaction.isChatInputCommand()) return;
                        if (interaction.commandName === handler.data.name) {
                            await handler.execute(interaction as CommandInteraction);
                        }
                    }
                });
            }
        }
    }

    // MARK: - Private members
    private discordToken: string;
    private databasePath: string;
    private managementGuildId: string;
    private managementGuildAdminUserId: string;
    private botId: string;

    private client: Client;
    private registry: EntityRegistry;

    private eventManager: EventManager = EventManager.getInstance();
    private commandHandlers: CommandHandler[] = [];
    public isInitialized: boolean = false;
}