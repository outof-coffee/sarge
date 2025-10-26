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
import { GuildSargeConfig, createGuildSargeConfigFromGuild, GuildOwnerType } from '../entities/guild-sarge-config.js';
import { EventManager } from '../event-manager.js';
import { Events, Client } from 'discord.js';
import { CommandHandler } from '../command-handler.js';
import { applyEmbedToReply } from '../utilities/embed-renderer.js';

export class SargeCommand implements CommandHandler {

    public constructor(
        private managementGuildId: string,
        private botId: string
    ) {
        this.managementGuildId = managementGuildId;
        this.botId = botId;
    }

    public data = new SlashCommandBuilder()
        .setName('sarge')
        .setDescription('Configure Sarge bot settings for this server.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Display current Sarge configuration for this server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-owner')
                .setDescription('Set the server owner for Sarge configuration')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to set as server owner')
                        .setRequired(false))
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to set as server owner')
                        .setRequired(false)));

    // MARK: - CommandHandler implementation
    public async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        const subcommand = (interaction as ChatInputCommandInteraction).options.getSubcommand();

        var reply: InteractionReplyOptions= {
            flags: MessageFlags.Ephemeral
        };

        switch (subcommand) {
            case 'show':
                reply = await this.executeShowAction(interaction as ChatInputCommandInteraction);
                break;
            case 'set-owner':
                reply = await this.executeSetOwnerAction(interaction as ChatInputCommandInteraction);
                break;
            default:
                reply.content = `Unknown subcommand: ${subcommand}`;
                break;
        }

        await interaction.reply(reply);
    }

    private async executeShowAction(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const reply: InteractionReplyOptions = {
            flags: MessageFlags.Ephemeral
        };

        const guild = interaction.guild;
        if (!guild) {
            reply.content = 'This command can only be used in a server (guild).';
            return reply;
        }

        // Check if a GuildSargeConfig already exists for this guild
        const queryResult = await repository.query(GuildSargeConfig, guild.id, {
            filter: (config) => config.id === "sarge-config-" + guild.id,
            limit: 1
        });

        let guildSargeConfig = queryResult.entities[0];
        let isNewConfig = false;

        if (!guildSargeConfig) {
            // Create a new GuildSargeConfig if it doesn't exist
            guildSargeConfig = createGuildSargeConfigFromGuild(guild);
            await repository.storeUnique(guildSargeConfig);
            isNewConfig = true;
        }

        // Check authorization
        const isAuthorized = await GuildSargeConfig.isUserAuthorized(
            interaction,
            guildSargeConfig.ownerType,
            guildSargeConfig.serverOwnerId
        );

        if (isAuthorized === false) {
            reply.content = `Sorry, ${interaction.user.displayName}, I'm afraid I can't do that.`;
            return reply;
        }

        // Generate embed and apply to reply
        const embed = await guildSargeConfig.toEmbed(guild, isNewConfig);
        return applyEmbedToReply(reply, embed);
    }

    private async executeSetOwnerAction(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const reply: InteractionReplyOptions = {
            flags: MessageFlags.Ephemeral
        };

        // Validate guild context
        const guild = interaction.guild;
        if (!guild) {
            reply.content = 'This command can only be used in a server (guild).';
            return reply;
        }

        // Extract both user and role options
        const targetUser = interaction.options.getUser('user', false);
        const targetRole = interaction.options.getRole('role', false);

        // Validate: exactly one option provided
        if (!targetUser && !targetRole) {
            reply.content = 'You must provide either a user or a role.';
            return reply;
        }

        if (targetUser && targetRole) {
            reply.content = 'You can only set either a user or a role as owner, not both.';
            return reply;
        }

        let ownerId: string;
        let ownerType: GuildOwnerType;
        let successMessage: string;

        // Handle user option
        if (targetUser) {
            // Validate: user is not a bot
            if (targetUser.bot) {
                reply.content = 'Cannot set a bot as the server owner.';
                return reply;
            }

            // Validate: user exists in the target guild
            try {
                await guild.members.fetch(targetUser.id);
            } catch (error) {
                reply.content = `User <@${targetUser.id}> is not a member of this server.`;
                return reply;
            }

            ownerId = targetUser.id;
            ownerType = GuildOwnerType.User;
            successMessage = `Server owner has been set to <@${targetUser.id}>.`;
        }
        // Handle role option
        else {
            // Validate: role exists in the guild
            try {
                await guild.roles.fetch(targetRole!.id);
            } catch (error) {
                reply.content = `Role <@&${targetRole!.id}> does not exist in this server.`;
                return reply;
            }

            ownerId = targetRole!.id;
            ownerType = GuildOwnerType.Role;
            successMessage = `Server owner has been set to <@&${targetRole!.id}>.`;
        }

        // Fetch existing config
        let existingConfig = await getGuildSargeConfig(guild.id);

        // Create config if it doesn't exist
        if (!existingConfig) {
            existingConfig = createGuildSargeConfigFromGuild(guild);
        }

        // Create updated config with new owner, preserving the original id for persistence
        const updatedConfig = new GuildSargeConfig(
            existingConfig.guildId,
            existingConfig.guildName,
            ownerId,
            ownerType,
            existingConfig.id
        );

        // Store the updated config using storeUnique to prevent duplicates
        await repository.storeUnique(updatedConfig);

        reply.content = successMessage;
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
                    await managementGuild.commands.create(this.data.toJSON());
                    console.log(`Registered command to guild: ${managementGuild.name}`);
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
    let guildSargeConfig = await getGuildSargeConfig(guild.id);

    if (!guildSargeConfig) {
        // Create a new GuildSargeConfig if it doesn't exist
        guildSargeConfig = createGuildSargeConfigFromGuild(guild);
        await repository.storeUnique(guildSargeConfig);
        // console.log(`Created GuildSargeConfig for guild: ${guild.name}`);
    }
}

// Delete GuildSargeConfig helper function, for when the bot leaves the guild or is removed another way
export async function handleGuildConfigDeletionEvent(guildId: string) {
    const guildSargeConfig = await getGuildSargeConfig(guildId);

    if (guildSargeConfig) {
        await repository.deleteUnique(
            GuildSargeConfig,
            guildSargeConfig.guildId,
            guildSargeConfig.id
        );
        // console.log(`Deleted GuildSargeConfig for guild ID: ${guildId}`);
    }
}

async function getGuildSargeConfig(guildId: string): Promise<GuildSargeConfig | null> {
    const queryResult = await repository.query(GuildSargeConfig, guildId, {
        filter: (config) => config.id === "sarge-config-" + guildId,
        limit: 1
    });

    const guildSargeConfig = queryResult.entities[0] || null;
    return guildSargeConfig;
}