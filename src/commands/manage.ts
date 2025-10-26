import { 
  SlashCommandBuilder, 
  CommandInteraction, 
  InteractionReplyOptions, 
  MessageFlags, 
  Interaction, 
  ChatInputCommandInteraction, 
  CacheType 
} from 'discord.js';

import { repository } from '@outof-coffee/cordex';
import { GuildInfo, calculateGuildFlag } from '../entities/guild-info.js';
import { EventHandler, EventManager } from '../event-manager.js';
import { Events, Client } from 'discord.js';
import { CommandHandler } from '../command-handler.js';

export class GuildManagement implements EventHandler<Events.ClientReady>, CommandHandler {

  private managementGuildId: string;
  private botId: string;

  constructor(managementGuildId: string, botId: string) {
    this.managementGuildId = managementGuildId;
    this.botId = botId;
  }

  event: Events.ClientReady = Events.ClientReady;

  // MARK: - EventHandler implementation
  async handle(client: Client) {
    console.log(`Logged in as ${client.user?.tag}`);

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

    const now = new Date();
    const guilds = client.guilds.cache;
    console.log(`Bot is in ${guilds.size} guild(s)`);

    for (const [guildId, guild] of guilds) {
      const queryResult = await repository.query(GuildInfo, 'app', {
        filter: (g) => g.guildId === guildId,
        limit: 1
      });
      const existingInfo = queryResult.entities[0];

      const guildInfo = new GuildInfo(
        guildId,
        guild.name,
        existingInfo?.joinedAt ?? now,
        now,
        guild.memberCount,
        guild.ownerId,
        calculateGuildFlag(existingInfo, guild)
      );

      await repository.storeUnique(guildInfo);
      console.log(`Stored/updated guild info for: ${guild.name} (${guildId})`);
    }
  }

  // MARK: - CommandHandler implementation
  public data = new SlashCommandBuilder()
    .setName('manage')
    .setDescription('Management commands')
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Management action to perform')
        .setRequired(false)
        .setChoices({ name: 'list', value: 'list' })
    );

  public async execute(interaction: CommandInteraction): Promise<void> {
    const action = (interaction as ChatInputCommandInteraction).options.getString('action') ?? 'list';

    var reply: InteractionReplyOptions = {
      flags: MessageFlags.Ephemeral
    };

    switch (action) {
      case 'list':
        reply = await this.executeListAction();
        break;
      default:
        reply.content = `Unknown action: ${action}`;
    }

    await interaction.reply(reply);
  }

  private async executeListAction(): Promise<InteractionReplyOptions> {
    const reply: InteractionReplyOptions = {
      flags: MessageFlags.Ephemeral
    };

    try {
      const allGuildInfos = await repository.getAll(GuildInfo, 'app');

      if (allGuildInfos.length === 0) {
        reply.content = 'No managed guilds found.';
        return reply;
      }

      const guildLines = allGuildInfos
        .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
        .map(info => `${info.guildName} (${info.guildId}) [${info.flag.toUpperCase()}] - ${info.memberCount} members`)
        .slice(0, 20); // Discord message limit consideration

      const content = `**Managed Guilds (${allGuildInfos.length} total)**\n\n${guildLines.join('\n')}`;
      reply.content = content.length > 2000 ? content.substring(0, 1997) + '...' : content;
    } catch (error) {
      console.error('Failed to retrieve guild list:', error);
      reply.content = 'Failed to retrieve guild list.';
    }

    return reply;
  }

  public registerCommandEvents(eventManager: EventManager) {
    eventManager.registerHandler(this);
    eventManager.registerHandler({
      event: Events.InteractionCreate,
      handle: async (interaction: Interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName === this.data.name) {
          await this.execute(interaction as ChatInputCommandInteraction<CacheType>);
        }
      }
    })
  }
}