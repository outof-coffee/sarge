import { DatabaseEntity } from '@outof-coffee/cordex';

export class BotConfig extends DatabaseEntity {
  static readonly storageKey = 'bot-config';
  
  readonly version: string;

  constructor(version: string) {
    super();
    this.version = version;
  }
}
