import { SlashCommandBuilder, EmbedBuilder, Colors, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class AvatarCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to get the avatar of').setRequired(false),
    );

  category = 'Utility';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user') ?? interaction.user;

    const serverAvatar = targetUser.displayAvatarURL({ size: 1024, extension: 'png' });
    const globalAvatar = targetUser.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });

    const embed = new EmbedBuilder()
      .setTitle(`Avatar — ${targetUser.tag}`)
      .setColor(Colors.Blurple)
      .setImage(serverAvatar)
      .setFooter({ text: 'Select a type below to switch between server and global avatar' });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('avatar_select')
      .setPlaceholder('Choose avatar type')
      .addOptions(
        {
          label: 'Server Avatar',
          description: 'The avatar for this server',
          value: 'server',
          emoji: '🏠',
        },
        {
          label: 'Global Avatar',
          description: 'The user\'s global avatar',
          value: 'global',
          emoji: '🌍',
        },
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60_000,
      max: 1,
    });

    collector.on('collect', async (i) => {
      if (!i.isStringSelectMenu()) return;

      const selected = i.values[0];
      const url = selected === 'global' ? globalAvatar : serverAvatar;

      const updatedEmbed = EmbedBuilder.from(embed)
        .setImage(url)
        .setDescription(`**${selected === 'global' ? 'Global' : 'Server'} Avatar**`);

      await i.update({ embeds: [updatedEmbed], components: [] });
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'limit') return;
      try {
        await reply.edit({ components: [] });
      } catch {
        // message may have been deleted
      }
    });
  }
}
