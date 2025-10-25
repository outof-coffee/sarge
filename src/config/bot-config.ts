import { DatabaseEntity } from '@outof-coffee/cordex';

export class BotConfig extends DatabaseEntity {
  static readonly storageKey = 'bot-config';

  constructor(public readonly version: string) {
    super();
  }
}
