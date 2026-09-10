import { SlashCommandBuilder, EmbedBuilder, Colors, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { AuditLogService } from '../../services/audit-log/AuditLogService';

export default class NickCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('nick')
    .setDescription("Change a member's nickname")
    .addUserOption((opt) => opt.setName('member').setDescription('The member to change nickname for').setRequired(true))
    .addStringOption((opt) => opt.setName('nickname').setDescription('The new nickname (leave empty to reset)').setRequired(false).setMaxLength(32))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames);

  category = 'Moderation';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ManageNicknames];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('member', true);
    const nickname = interaction.options.getString('nickname');

    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({ content: '❌ Member not found in this server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const botMember = await interaction.guild.members.fetchMe();
    if (botMember && targetMember.roles.highest.position >= botMember.roles.highest.position) {
      await interaction.reply({ content: '❌ Cannot change the nickname of a member with an equal or higher role than the bot.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const oldNickname = targetMember.nickname || targetUser.username;

      await targetMember.setNickname(nickname || null, `Changed by ${interaction.user.tag}`);

      AuditLogService.logModeration(interaction.guildId!, 'nickname_change', interaction.user.id, targetUser.id, `Changed to: ${nickname || 'reset'}`);

      const newNickname = nickname || targetUser.username;

      const embed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle('Nickname Changed')
        .setDescription(`Successfully changed ${targetUser.tag}'s nickname.`)
        .addFields(
          { name: 'Old Nickname', value: oldNickname, inline: true },
          { name: 'New Nickname', value: newNickname, inline: true }
        )
        .setFooter({ text: `Changed by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ content: '❌ Failed to change nickname. Ensure the bot has the **Manage Nicknames** permission.' });
    }
  }
}
