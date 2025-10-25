import { DatabaseEntity } from '@outof-coffee/cordex';

export enum GuildFlag {
  Green = 'green',
  Yellow = 'yellow',
  Red = 'red'
}

export class GuildInfo extends DatabaseEntity {
  static readonly storageKey = 'guild-registry';

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
    this.guildId = guildId;
    this.guildName = guildName;
    this.joinedAt = joinedAt;
    this.lastSeen = lastSeen;
    this.memberCount = memberCount;
    this.ownerId = ownerId;
    this.flag = flag;
  }
}
