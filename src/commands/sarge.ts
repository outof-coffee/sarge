import { 
    SlashCommandBuilder,
    CommandInteraction,
    ChatInputCommandInteraction,
    InteractionReplyOptions,
    Interaction,
    CacheType,
    MessageFlags,
    Guild
} from 'discord.js';

import { repository } from '@outof-coffee/cordex';
import { GuildSargeConfig, createGuildSargeConfigFromGuild } from '../entities/guild-sarge-config.js';
import { EventManager } from '../event-manager.js';
import { Events, Client } from 'discord.js';
import { CommandHandler } from '../command-handler.js';

export class SargeCommand implements CommandHandler {

    public constructor(private managementGuildId: string, private botId: string) {
        this.managementGuildId = managementGuildId;
        this.botId = botId;
    }

    public data = new SlashCommandBuilder()
        .setName('sarge')
        .setDescription('Configure Sarge bot settings for this server.');

    // MARK: - CommandHandler implementation
    public async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        const action = (interaction as ChatInputCommandInteraction).options.getString('action') ?? 'show';

        var reply: InteractionReplyOptions= {
            flags: MessageFlags.Ephemeral
        };

        switch (action) {
            case 'show':
                const interactionGuild = interaction.guild;
                if (!interactionGuild) {
                    reply.content = 'This command can only be used in a server (guild).';
                    break;
                }
                reply = await this.executeShowAction(interactionGuild);
                break;
            default:
                reply.content = `Unknown action: ${action}`;
                break;
        }

        await interaction.reply(reply);
    }

    private async executeShowAction(guild: Guild): Promise<InteractionReplyOptions> {
        const reply: InteractionReplyOptions = {
            flags: MessageFlags.Ephemeral
        };

        // Check if a GuildSargeConfig already exists for this guild
        const queryResult = await repository.query(GuildSargeConfig, guild.id, {
            filter: (config) => config.id === "sarge-config-" + guild.id,
            limit: 1
        });

        let guildSargeConfig = queryResult.entities[0];

        var content: string = '';

        if (!guildSargeConfig) {
            // Create a new GuildSargeConfig if it doesn't exist
            guildSargeConfig = createGuildSargeConfigFromGuild(guild);
            await repository.store(guildSargeConfig);
            content += `A new configuration has been created with default settings.\n`;
        }

        content += `Sarge bot is configured for this server.\n` +
                   `Server Name: ${guildSargeConfig.guildName}\n` +
                   `Server Owner ID: ${guildSargeConfig.serverOwnerId}\n` +
                   `Owner Type: ${guildSargeConfig.ownerType}`;

        reply.content = content;
        return reply;
    }

    // since we need to create / validate during clientReady and on restart, we need to implement multiple event handlers
    public registerCommandEvents(eventManager: EventManager): void {
        // first, clientReady to create or update the config if invalid
        eventManager.registerHandler({
            event: Events.ClientReady,
            handle: async (client: Client) => {
                // First, temporary code to only put this on the development guild; later this will be managed correctly as a global command
                try {
                    const managementGuild = await client.guilds.fetch(this.managementGuildId);
                    await managementGuild.commands.set([this.data.toJSON()]);
                    console.log(`Registered commands to guild: ${managementGuild.name}`);
                } catch (error) {
                    console.error(`Failed to register commands to guild ${this.managementGuildId}:`, error);
                    console.warn('The bot may not have been added to the management guild yet.');
                    console.warn(`Please add the bot to the guild using this URL:`);
                    console.warn(`https://discord.com/oauth2/authorize?client_id=${this.botId}`);
                }
                // TODO: uncomment the below once development is done and we want global commands
                // await client.application?.commands.set([this.data.toJSON()]);
                
                // Since we know the client has restarted, we can validate all guilds from client.guilds.cache
                const guilds = client.guilds.cache;
                for (const [guildId, guild] of guilds) {
                    await handleGuildConfigValidationEvent(guild);
                }
            }
        });

        // next, guildCreate to handle when the bot is added to a new guild
        eventManager.registerHandler({
            event: Events.GuildCreate,
            handle: async (guild) => {
                await handleGuildConfigValidationEvent(guild);
            }
        });

        // next, guildDelete to handle when the bot is removed from a guild
        eventManager.registerHandler({
            event: Events.GuildDelete,
            handle: async (guild) => {
                await handleGuildConfigDeletionEvent(guild.id);
            }
        });
        
        // Finally, register the event for the command itself
        eventManager.registerHandler({
            event: Events.InteractionCreate,
            handle: async (interaction: Interaction) => {
                if (!interaction.isChatInputCommand()) return;
                if (interaction.commandName === this.data.name) {
                    await this.execute(interaction as ChatInputCommandInteraction);
                }
            }
        });
    }
}

// Check and create GuildSargeConfig for all guilds the bot is in on events that matter
export async function handleGuildConfigValidationEvent(guild: Guild) {
    const queryResult = await repository.query(GuildSargeConfig, guild.id, {
        filter: (config) => config.id === "sarge-config-" + guild.id,
        limit: 1
    });

    let guildSargeConfig = queryResult.entities[0];

    if (!guildSargeConfig) {
        // Create a new GuildSargeConfig if it doesn't exist
        guildSargeConfig = createGuildSargeConfigFromGuild(guild);
        await repository.storeUnique(guildSargeConfig);
        // console.log(`Created GuildSargeConfig for guild: ${guild.name}`);
    }
}

// Delete GuildSargeConfig helper function, for when the bot leaves the guild or is removed another way
export async function handleGuildConfigDeletionEvent(guildId: string) {
    const queryResult = await repository.query(GuildSargeConfig, guildId, {
        filter: (config) => config.id === "sarge-config-" + guildId,
        limit: 1
    });

    const guildSargeConfig = queryResult.entities[0];

    if (guildSargeConfig) {
        await repository.deleteUnique(
            GuildSargeConfig,
            guildSargeConfig.guildId,
            guildSargeConfig.id
        );
        // console.log(`Deleted GuildSargeConfig for guild ID: ${guildId}`);
    }
}