import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { ModerationService } from '../../services/moderation/ModerationService';
import { ModerationHierarchyService } from '../../services/moderation/ModerationHierarchyService';

export default class BanCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member from the server.')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the ban').setRequired(false).setMaxLength(512)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

  category = 'Moderation';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.BanMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({ content: '❌ User not found in this server.', flags: MessageFlags.Ephemeral });
      return;
    }

    ModerationHierarchyService.checkCanBan(interaction, targetMember);

    await interaction.deferReply();

    const service = new ModerationService();
    const modCase = await service.ban(interaction, targetMember, reason);

    const embed = ModerationService.buildModerationEmbed(
      modCase,
      `${targetUser.tag} (${targetUser.id})`,
      `${interaction.user.tag}`
    );

    await interaction.editReply({ embeds: [embed] });
  }
}
