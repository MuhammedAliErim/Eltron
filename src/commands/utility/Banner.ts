import { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class BannerCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Get a user\'s banner')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to get the banner of').setRequired(false),
    );

  category = 'Utility';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user') ?? interaction.user;

    try {
      const fetchedUser = await targetUser.fetch();

      if (!fetchedUser.banner) {
        const embed = new EmbedBuilder()
          .setTitle(`Banner — ${targetUser.tag}`)
          .setDescription('This user has no banner set.')
          .setColor(Colors.Greyple)
          .setThumbnail(targetUser.displayAvatarURL({ size: 256 }));

        await interaction.reply({ embeds: [embed] });
        return;
      }

      const bannerURL = fetchedUser.bannerURL({ size: 1024, extension: 'png' }) ?? fetchedUser.bannerURL({ size: 1024 }) ?? fetchedUser.bannerURL();

      const embed = new EmbedBuilder()
        .setTitle(`Banner — ${targetUser.tag}`)
        .setColor(fetchedUser.hexAccentColor ?? Colors.Blurple)
        .setImage(bannerURL as string)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `User ID: ${targetUser.id}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch {
      const embed = new EmbedBuilder()
        .setTitle(`Banner — ${targetUser.tag}`)
        .setDescription('Failed to fetch user banner.')
        .setColor(Colors.Red);

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
}
