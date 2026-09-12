import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, Colors } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class VoiceMuteCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('voicemute')
    .setDescription('Mute a member in voice channel')
    .addUserOption(opt => opt.setName('user').setDescription('The user to mute').setRequired(true))
    .addBooleanOption(opt => opt.setName('mute').setDescription('Mute or unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers);

  category = 'Voice';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.MuteMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const mute = interaction.options.getBoolean('mute', true);

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
      await targetMember.voice.setMuted(mute, `Voice muted by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setTitle(mute ? '🔇 User Voice Muted' : '🔊 User Voice Unmuted')
        .setColor(mute ? Colors.Red : Colors.Green)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Channel', value: targetMember.voice.channel.name, inline: true },
          { name: 'Status', value: mute ? 'Muted' : 'Unmuted', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
}
