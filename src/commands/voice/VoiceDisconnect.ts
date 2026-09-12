import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, Colors } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class VoiceDisconnectCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('voicedisconnect')
    .setDescription('Disconnect a member from voice channel')
    .addUserOption(opt => opt.setName('user').setDescription('The user to disconnect').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false).setMaxLength(512))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers);

  category = 'Voice';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.MoveMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({ content: '❌ User not found in this server.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (!targetMember.voice.channel) {
      await interaction.reply({ content: '❌ User is not in a voice channel.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const channelName = targetMember.voice.channel.name;
      await targetMember.voice.disconnect(`Disconnected by ${interaction.user.tag}: ${reason}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ User Disconnected')
        .setColor(Colors.Orange)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Channel', value: channelName, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to disconnect user: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
}
