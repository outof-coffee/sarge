import { DatabaseEntity, IdentifiedEntity } from '@outof-coffee/cordex';
import { Guild } from 'discord.js';

export class GuildInfo extends DatabaseEntity implements IdentifiedEntity {
  static readonly storageKey = 'guild-registry';

  readonly id: string;
  readonly guildId: string;
  readonly guildName: string;
  readonly joinedAt: Date;
  readonly lastSeen: Date;
  readonly memberCount: number;
  readonly ownerId: string;
  readonly flag: GuildFlag;

  constructor(
    guildId: string,
    guildName: string,
    joinedAt: Date,
    lastSeen: Date,
    memberCount: number,
    ownerId: string,
    flag: GuildFlag = GuildFlag.Green
  ) {
    super();
    this.id = "guild-" + guildId;
    this.guildId = guildId;
    this.guildName = guildName;
    this.joinedAt = joinedAt;
    this.lastSeen = lastSeen;
    this.memberCount = memberCount;
    this.ownerId = ownerId;
    this.flag = flag;
  }
}

export enum GuildFlag {
  Green = 'green',
  Yellow = 'yellow',
  Red = 'red'
}

export function calculateGuildFlag(existingInfo: GuildInfo | undefined, guildData: Guild): GuildFlag {
  if (!existingInfo) {
    // New guild, determine flag based on member count
    // Big guilds start red and will be downgraded over time if no issues arise
    if (guildData.memberCount > 1000 || (guildData.approximateMemberCount && guildData.approximateMemberCount > 1000)) {
        return GuildFlag.Red; // very large guilds are high risk
    }
    return GuildFlag.Green;
  }

  const memberCountChanged = existingInfo.memberCount !== guildData.memberCount;

  if (memberCountChanged) {
    const changeRatio = Math.abs(guildData.memberCount - existingInfo.memberCount) / existingInfo.memberCount;

    // because a 20% change in member count is significant
    if (changeRatio >= 0.2) {
      return GuildFlag.Red;
    } else if (changeRatio >= 0.1) {
      return GuildFlag.Yellow;
    }
  }

  if (guildData.memberCount >= 99) {
    return GuildFlag.Yellow; // larger guilds mean more requirements in developer console
  }

  if (existingInfo.flag === GuildFlag.Red && existingInfo.lastSeen.getTime() + 30 * 24 * 60 * 60 * 1000 < new Date().getTime()) {
    return GuildFlag.Yellow; // degrade red to yellow over 30 days
  }

  if (existingInfo.flag === GuildFlag.Yellow && existingInfo.lastSeen.getTime() + 30 * 24 * 60 * 60 * 1000 < new Date().getTime()) {
    return GuildFlag.Green; // degrade yellow to green over 30 days
  }

  return GuildFlag.Green;
}