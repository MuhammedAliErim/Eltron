import { SlashCommandBuilder, EmbedBuilder, Colors, ChannelType, TextChannel, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class EmbedCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a custom embed message')
    .addStringOption((option) =>
      option.setName('title').setDescription('Embed title').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('description').setDescription('Embed description').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('color').setDescription('Hex color (e.g. #FF5733)').setRequired(false),
    )
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Channel to send the embed to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

  category = 'Utility';
  cooldown = 10;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const colorInput = interaction.options.getString('color');
    const channelOption = interaction.options.getChannel('channel');

    let color = Colors.Blurple;
    if (colorInput) {
      const cleaned = colorInput.replace(/^#/, '');
      const parsed = parseInt(cleaned, 16);
      if (!isNaN(parsed) && cleaned.length === 6) {
        color = parsed;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    await interaction.deferReply({ flags: 64 });

    try {
      if (channelOption) {
        const channel = interaction.guild?.channels.cache.get(channelOption.id) as TextChannel | undefined;
        if (!channel) {
          await interaction.editReply('Channel not found.');
          return;
        }
        await channel.send({ embeds: [embed] });
        await interaction.editReply(`Embed sent to ${channel}.`);
      } else {
        await interaction.channel?.send({ embeds: [embed] });
        await interaction.editReply('Embed sent.');
      }
    } catch {
      await interaction.editReply('Failed to send the embed. Check my permissions.');
    }
  }
}
