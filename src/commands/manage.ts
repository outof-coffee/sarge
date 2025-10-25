import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('manage')
  .setDescription('Management commands');

export async function execute(interaction: ChatInputCommandInteraction, managementGuildId: string) {
  const guild = interaction.client.guilds.cache.get(managementGuildId);

  if (!guild) {
    await interaction.reply({ content: 'Could not find management guild', ephemeral: true });
    return;
  }

  await interaction.reply({ content: `Management guild: ${guild.name}`, ephemeral: true });
}
