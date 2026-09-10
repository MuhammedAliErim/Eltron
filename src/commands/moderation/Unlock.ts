import { SlashCommandBuilder, EmbedBuilder, Colors, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { AuditLogService } from '../../services/audit-log/AuditLogService';

export default class UnlockCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel (allow @everyone to send messages)')
    .addChannelOption((opt) => opt.setName('channel').setDescription('The channel to unlock').setRequired(false))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for unlocking').setRequired(false).setMaxLength(512))
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

      await targetChannel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null }, { reason: `Unlocked by ${interaction.user.tag}: ${reason}` });

      AuditLogService.logChannelChange(interaction.guildId!, interaction.user.id, channel.id, 'channel_unlock', { reason });

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle('Channel Unlocked')
        .setDescription(`${channel} has been unlocked.`)
        .addFields({ name: 'Reason', value: reason })
        .setFooter({ text: `Unlocked by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ content: '❌ Failed to unlock the channel. Ensure the bot has the **Manage Channels** permission.' });
    }
  }
}
