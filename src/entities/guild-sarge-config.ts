import { DiscordEntity, IdentifiedEntity } from '@outof-coffee/cordex';
import { Guild, CommandInteraction, CacheType } from 'discord.js';

export class GuildSargeConfig extends DiscordEntity implements IdentifiedEntity {
    static readonly storageKey = 'guild-sarge-config';
    
    readonly id: string;
    readonly guildName: string;
    readonly serverOwnerId: string;
    readonly ownerType: GuildOwnerType;

    // Mark: - Public constructor
    constructor(guildId: string, guildName: string, guildOwnerId: string, ownerType: GuildOwnerType = GuildOwnerType.User, id?: string) {
        super(guildId);
        this.id = id || "sarge-config-" + guildId;
        this.guildName = guildName;
        this.serverOwnerId = guildOwnerId;
        this.ownerType = ownerType; // TODO: make an enum
    }

    // Mark: - Authorization
    public static async isUserAuthorized(
        interaction: CommandInteraction<CacheType>,
        ownerType: GuildOwnerType,
        ownerId: string
    ): Promise<boolean | undefined> {
        // Discord server owners always have access
        if (interaction.guild && interaction.user.id === interaction.guild.ownerId) {
            return true;
        }

        if (ownerType === GuildOwnerType.User) {
            return interaction.user.id === ownerId;
        }

        if (ownerType === GuildOwnerType.Role) {
            if (!interaction.guild) {
                return false;
            }

            try {
                const member = await interaction.guild.members.fetch(interaction.user.id);
                const hasRole = member.roles.cache.has(ownerId);
                return hasRole;
            } catch (error) {
                // Role doesn't exist
                return undefined;
            }
        }

        return false;
    }

    // Mark: - Display helpers
    private static async resolveUserDisplay(guild: Guild, userId: string): Promise<string> {
        try {
            const member = await guild.members.fetch(userId);
            return member.displayName;
        } catch (error) {
            // TODO: Handle deleted users in a guild member removal event handler (future development cycle)
            return '[Unknown User]';
        }
    }

    private static async resolveRoleDisplay(guild: Guild, roleId: string): Promise<string> {
        try {
            const role = await guild.roles.fetch(roleId);
            if (!role) {
                // TODO: Handle deleted roles in a role deletion event handler (future development cycle)
                return '[Unknown Role]';
            }
            return role.name;
        } catch (error) {
            // TODO: Handle deleted roles in a role deletion event handler (future development cycle)
            return '[Unknown Role]';
        }
    }

    public static async getOwnerDisplay(
        guild: Guild,
        ownerType: GuildOwnerType,
        ownerId: string
    ): Promise<string> {
        const type = ownerType.toLowerCase();

        if (ownerType === GuildOwnerType.User) {
            const displayName = await this.resolveUserDisplay(guild, ownerId);
            return `\`@${displayName} (${type})\``;
        }

        if (ownerType === GuildOwnerType.Role) {
            const displayName = await this.resolveRoleDisplay(guild, ownerId);
            return `\`@${displayName} (${type})\``;
        }

        return `\`[Unknown] (${type})\``;
    }
}

export enum GuildOwnerType {
    User = "user",
    Role = "role"
}

// helper function that takes a Guild and returns a GuildSargeConfig
export function createGuildSargeConfigFromGuild(guild: Guild): GuildSargeConfig {
    return new GuildSargeConfig(
        guild.id,
        guild.name,
        guild.ownerId,
        GuildOwnerType.User // default to User, can be changed later
    );
}