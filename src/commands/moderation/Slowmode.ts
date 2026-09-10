import { SlashCommandBuilder, EmbedBuilder, Colors, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { AuditLogService } from '../../services/audit-log/AuditLogService';

export default class SlowmodeCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode delay for a channel')
    .addChannelOption((opt) => opt.setName('channel').setDescription('The channel to set slowmode for').setRequired(true))
    .addIntegerOption((opt) => opt.setName('duration').setDescription('Slowmode duration in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

  category = 'Moderation';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ManageChannels];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const channel = interaction.options.getChannel('channel', true);
    const duration = interaction.options.getInteger('duration', true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const targetChannel = await interaction.guild?.channels.fetch(channel.id);
      if (!targetChannel || !targetChannel.isTextBased()) {
        await interaction.editReply({ content: '❌ Invalid channel provided.' });
        return;
      }

      await targetChannel.setRateLimitPerUser(duration, `Set by ${interaction.user.tag}`);

      AuditLogService.logChannelChange(interaction.guildId!, interaction.user.id, channel.id, 'slowmode_change', { duration });

      const formattedDuration = duration === 0
        ? 'Disabled'
        : duration < 60
          ? `${duration} second${duration !== 1 ? 's' : ''}`
          : duration < 3600
            ? `${Math.floor(duration / 60)} minute${Math.floor(duration / 60) !== 1 ? 's' : ''} ${duration % 60 !== 0 ? `${duration % 60} second${duration % 60 !== 1 ? 's' : ''}` : ''}`
            : `${Math.floor(duration / 3600)} hour${Math.floor(duration / 3600) !== 1 ? 's' : ''} ${Math.floor((duration % 3600) / 60) !== 0 ? `${Math.floor((duration % 3600) / 60)} minute${Math.floor((duration % 3600) / 60) !== 1 ? 's' : ''}` : ''}`;

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle('Slowmode Updated')
        .setDescription(`Slowmode for ${channel} has been set to **${formattedDuration}**.`)
        .setFooter({ text: `Set by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ content: '❌ Failed to set slowmode. Ensure the bot has the **Manage Channels** permission.' });
    }
  }
}
