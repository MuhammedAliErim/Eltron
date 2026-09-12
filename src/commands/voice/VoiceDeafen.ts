import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, Colors } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class VoiceDeafenCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('voicedeafen')
    .setDescription('Deafen a member in voice channel')
    .addUserOption(opt => opt.setName('user').setDescription('The user to deafen').setRequired(true))
    .addBooleanOption(opt => opt.setName('deafen').setDescription('Deafen or undeafen').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.DeafenMembers);

  category = 'Voice';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.DeafenMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const deafen = interaction.options.getBoolean('deafen', true);

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
      await targetMember.voice.setDeaf(deafen, `Voice deafened by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setTitle(deafen ? '🔇 User Voice Deafened' : '🔊 User Voice Undeafened')
        .setColor(deafen ? Colors.Red : Colors.Green)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Channel', value: targetMember.voice.channel.name, inline: true },
          { name: 'Status', value: deafen ? 'Deafened' : 'Undeafened', inline: true }
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
