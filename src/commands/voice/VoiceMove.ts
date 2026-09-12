import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, Colors, ChannelType } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class VoiceMoveCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('voicemove')
    .setDescription('Move a member to another voice channel')
    .addUserOption(opt => opt.setName('user').setDescription('The user to move').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Target voice channel').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers);

  category = 'Voice';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.MoveMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const channel = interaction.options.getChannel('channel', true);

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
      const fromChannel = targetMember.voice.channel.name;
      await targetMember.voice.setChannel(channel.id, `Moved by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ User Moved')
        .setColor(Colors.Green)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'From', value: fromChannel, inline: true },
          { name: 'To', value: `<#${channel.id}>`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to move user: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
}
