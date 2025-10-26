import { DiscordEntity, IdentifiedEntity } from '@outof-coffee/cordex';
import { Guild } from 'discord.js';

export class GuildSargeConfig extends DiscordEntity implements IdentifiedEntity {
    static readonly storageKey = 'guild-sarge-config';
    
    readonly id: string;
    readonly guildName: string;
    readonly serverOwnerId: string;
    readonly ownerType: GuildOwnerType;

    // Mark: - Public constructor
    constructor(guildId: string, guildName: string, guildOwnerId: string, ownerType: GuildOwnerType = GuildOwnerType.User) {
        super(guildId);
        this.id = "sarge-config-" + guildId;
        this.guildName = guildName;
        this.serverOwnerId = guildOwnerId;
        this.ownerType = ownerType; // TODO: make an enum
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