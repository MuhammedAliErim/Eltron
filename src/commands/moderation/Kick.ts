import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { ModerationService } from '../../services/moderation/ModerationService';
import { ModerationHierarchyService } from '../../services/moderation/ModerationHierarchyService';
import { AuditLogService } from '../../services/audit-log/AuditLogService';

export default class KickCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a member from the server.')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the kick').setRequired(false).setMaxLength(512)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

  category = 'Moderation';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.KickMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({ content: '❌ User not found in this server.', flags: MessageFlags.Ephemeral });
      return;
    }

    ModerationHierarchyService.checkCanKick(interaction, targetMember);

    await interaction.deferReply();

    const service = new ModerationService();
    const modCase = await service.kick(interaction, targetMember, reason);

    AuditLogService.logModeration(interaction.guildId!, 'kick', interaction.user.id, targetUser.id, reason);

    const embed = ModerationService.buildModerationEmbed(
      modCase,
      `${targetUser.tag} (${targetUser.id})`,
      `${interaction.user.tag}`
    );

    await interaction.editReply({ embeds: [embed] });
  }
}
