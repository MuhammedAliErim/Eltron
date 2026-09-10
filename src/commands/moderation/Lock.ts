import { SlashCommandBuilder, EmbedBuilder, Colors, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { AuditLogService } from '../../services/audit-log/AuditLogService';

export default class LockCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel (prevent @everyone from sending messages)')
    .addChannelOption((opt) => opt.setName('channel').setDescription('The channel to lock').setRequired(false))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for locking').setRequired(false).setMaxLength(512))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

  category = 'Moderation';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ManageChannels];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.guild || !channel) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const targetChannel = await interaction.guild.channels.fetch(channel.id);
      if (!targetChannel || !targetChannel.isTextBased()) {
        await interaction.editReply({ content: '❌ Invalid channel provided.' });
        return;
      }

      await targetChannel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false }, { reason: `Locked by ${interaction.user.tag}: ${reason}` });

      AuditLogService.logChannelChange(interaction.guildId!, interaction.user.id, channel.id, 'channel_lock', { reason });

      const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setTitle('Channel Locked')
        .setDescription(`${channel} has been locked.`)
        .addFields({ name: 'Reason', value: reason })
        .setFooter({ text: `Locked by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ content: '❌ Failed to lock the channel. Ensure the bot has the **Manage Channels** permission.' });
    }
  }
}
