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

    // MARK: - Constructor
    constructor() {
        const { envDiscordToken, envManagementGuildId, envManagementGuildAdminUserId, envBotId } = resolveEnvironment();

        this.discordToken = envDiscordToken;
        this.managementGuildId = envManagementGuildId;
        this.managementGuildAdminUserId = envManagementGuildAdminUserId;
        this.botId = envBotId;

        this.databasePath = process.env.DATABASE_PATH || './data/bot-database.json';

        this.client = new Client({
            intents: resolveIntents()
        });

        this.registry = new EntityRegistry();
    }

    // MARK: - Public methods
    public async initialize() {
        // Initialize static data
        this.registerAppData();

        // Register commands and their entities
        this.registerCommands(
            new GuildManagement(this.managementGuildId, this.botId, this.managementGuildAdminUserId),
            new SargeCommand(this.managementGuildId, this.botId)
        );

        // Attach event handlers, including command interactions
        this.attachHandlers();

        // Initialize database
        await this.initializeDatabase();

        this.isInitialized = true;
    }

    public async run() {
        if (!this.isInitialized) {
            throw new Error('Bot must be initialized before running');
        }
        await this.client.login(this.discordToken);
    }

    // MARK: - Private methods
    private async initializeDatabase() {
        const databasePath = this.databasePath;
        await repository.initialize({
            databasePath,
            entityRegistry: this.registry
        });

        const existingConfigs = await repository.getAll(BotConfig);
        // TODO: Handle migrations if VERSION changes
        const config = existingConfigs.length > 0 ? existingConfigs[0] : new BotConfig(VERSION);

        if (existingConfigs.length === 0) {
            await repository.store(config);
        }
    }

    private registerCommands(...commands: CommandHandler[]) {
        for (const command of commands) {
            this.commandHandlers.push(command);
            if (command.registerCommandEntities) {
                command.registerCommandEntities(this.registry);
            }
        }
    }

    private registerAppData() {
        this.registry.register(BotConfig, () => 'app');
        this.registry.register(GuildInfo, () => 'app');
        this.registry.register(GuildSargeConfig, () => 'app');
    }

    private attachHandlers() {
        this.attachCommandHandlers();
        this.eventManager.attachHandlers(this.client);
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

// MARK: - Private helpers
function resolveEnvironment(): {
    envDiscordToken: string,
    envManagementGuildId: string,
    envManagementGuildAdminUserId: string,
    envBotId: string
} {
    const envDiscordToken = process.env.DISCORD_TOKEN;
    const envManagementGuildId = process.env.MANAGEMENT_GUILD_ID;
    const envManagementGuildAdminUserId = process.env.MANAGEMENT_GUILD_ADMIN_USER_ID; // TODO: make this optional if a role id is provided instead
    const envBotId = process.env.BOT_ID;

    if (!envDiscordToken) {
        throw new Error('DISCORD_TOKEN environment variable is required');
    }
    if (!envManagementGuildId) {
        throw new Error('MANAGEMENT_GUILD_ID environment variable is required');
    }
    if (!envManagementGuildAdminUserId) {
        throw new Error('MANAGEMENT_GUILD_ADMIN_USER_ID environment variable is required');
    }
    if (!envBotId) {
        throw new Error('BOT_ID environment variable is required');
    }

    return {
        envDiscordToken,
        envManagementGuildId,
        envManagementGuildAdminUserId,
        envBotId
    };
}

function resolveIntents(): GatewayIntentBits[] {
    return [
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
}