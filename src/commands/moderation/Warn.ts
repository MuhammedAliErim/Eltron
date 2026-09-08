import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { ModerationService } from '../../services/moderation/ModerationService';
import { ModerationHierarchyService } from '../../services/moderation/ModerationHierarchyService';

export default class WarnCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warns a member.')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the warning').setRequired(false).setMaxLength(512)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

  category = 'Moderation';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ModerateMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
      return;
    }

    ModerationHierarchyService.checkCanTimeout(interaction, targetMember);

    await interaction.deferReply();

    const service = new ModerationService();
    const modCase = await service.warn(interaction, targetMember, reason);

    const embed = ModerationService.buildModerationEmbed(
      modCase,
      `${targetUser.tag} (${targetUser.id})`,
      `${interaction.user.tag}`
    );

    await interaction.editReply({ embeds: [embed] });
  }
}
