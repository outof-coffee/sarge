import { SlashCommandBuilder, CommandInteraction, InteractionReplyOptions, MessageFlags, Interaction, ChatInputCommandInteraction, CacheType } from 'discord.js';
import { repository } from '@outof-coffee/cordex';
import { GuildInfo, GuildFlag } from '../entities/guild-info.js';
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
      const existingGuildInfos = await repository.getAll(GuildInfo, 'app');
      const existingInfo = existingGuildInfos.find(g => g.guildId === guildId);

      const guildInfo = new GuildInfo(
        guildId,
        guild.name,
        existingInfo?.joinedAt ?? now,
        now,
        guild.memberCount,
        guild.ownerId,
        existingInfo?.flag ?? GuildFlag.Green
      );

      await repository.store(guildInfo);
      console.log(`Stored/updated guild info for: ${guild.name} (${guildId})`);
    }
  }

  // MARK: - CommandHandler implementation
  public data = new SlashCommandBuilder()
    .setName('manage')
    .setDescription('Management commands');

  public async execute(interaction: CommandInteraction): Promise<void> {
    const guild = interaction.client.guilds.cache.get(this.managementGuildId);
    var reply: InteractionReplyOptions = {
      flags: MessageFlags.Ephemeral
    };
    if (guild) {
      reply.content = `Management guild: ${guild.name}`;
    } else {
      reply.content = 'Could not find management guild';
    }
    await interaction.reply(reply);
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