import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  type GuildMember,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { ApplicationRepository } from '../../database/repositories/ApplicationRepository';
import {
  createApplication,
  submitApplication,
  approveApplication,
  rejectApplication,
  withdrawApplication,
  getApplicationInfo,
  getQuestions,
} from '../../services/application/ApplicationService';
import { ApplicationType } from '../../database/schema';

const repo = new ApplicationRepository();

export default class ApplicationCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('application')
    .setDescription('Application management')
    .addSubcommand((sub) =>
      sub
        .setName('apply')
        .setDescription('Start a new application')
        .addStringOption((opt) =>
          opt.setName('type')
            .setDescription('Application type')
            .setRequired(true)
            .addChoices(
              { name: 'Staff', value: 'STAFF' },
              { name: 'Family', value: 'FAMILY' },
              { name: 'Partnership', value: 'PARTNERSHIP' },
              { name: 'Other', value: 'OTHER' },
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Check your application status')
        .addIntegerOption((opt) =>
          opt.setName('application_id').setDescription('Application ID').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('withdraw')
        .setDescription('Withdraw your application')
        .addIntegerOption((opt) =>
          opt.setName('application_id').setDescription('Application ID to withdraw').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List applications (staff)')
        .addStringOption((opt) =>
          opt.setName('status')
            .setDescription('Filter by status')
            .setRequired(false)
            .addChoices(
              { name: 'Draft', value: 'DRAFT' },
              { name: 'Submitted', value: 'SUBMITTED' },
              { name: 'Under Review', value: 'UNDER_REVIEW' },
              { name: 'Approved', value: 'APPROVED' },
              { name: 'Rejected', value: 'REJECTED' },
            )
        )
        .addStringOption((opt) =>
          opt.setName('type')
            .setDescription('Filter by type')
            .setRequired(false)
            .addChoices(
              { name: 'Staff', value: 'STAFF' },
              { name: 'Family', value: 'FAMILY' },
              { name: 'Partnership', value: 'PARTNERSHIP' },
              { name: 'Other', value: 'OTHER' },
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('review')
        .setDescription('Review an application (staff)')
        .addIntegerOption((opt) =>
          opt.setName('application_id').setDescription('Application ID to review').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('approve')
        .setDescription('Approve an application (staff)')
        .addIntegerOption((opt) =>
          opt.setName('application_id').setDescription('Application ID to approve').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reject')
        .setDescription('Reject an application (staff)')
        .addIntegerOption((opt) =>
          opt.setName('application_id').setDescription('Application ID to reject').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Rejection reason').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  category = 'Staff';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'apply':
        return this.handleApply(interaction);
      case 'status':
        return this.handleStatus(interaction);
      case 'withdraw':
        return this.handleWithdraw(interaction);
      case 'list':
        return this.handleList(interaction);
      case 'review':
        return this.handleReview(interaction);
      case 'approve':
        return this.handleApprove(interaction);
      case 'reject':
        return this.handleReject(interaction);
    }
  }

  private async handleApply(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString('type', true) as ApplicationType;
    const member = interaction.member as GuildMember;
    if (!member) {
      await interaction.editReply({ content: 'Could not identify you as a member.' });
      return;
    }

    const result = await createApplication(
      interaction.guildId!,
      member.id,
      type,
      repo
    );

    if (!result.success || !result.application) {
      await interaction.editReply({ content: result.message });
      return;
    }

    const questions = getQuestions(type);
    const modal = new ModalBuilder()
      .setCustomId(`app_submit:${result.application.id}`)
      .setTitle(`${type} Application`);

    for (const q of questions.slice(0, 5)) {
      const input = new TextInputBuilder()
        .setCustomId(q.id)
        .setLabel(q.question.substring(0, 45))
        .setStyle(q.type === 'LONG_TEXT' ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(q.required)
        .setMaxLength(Math.min(q.maxLength, 4000));

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    }

    await interaction.editReply({ content: 'Opening application form...' });

    try {
      await interaction.showModal(modal);
    } catch {
      await interaction.editReply({ content: 'Failed to open application form. Please try again.' });
    }
  }

  async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    if (!interaction.customId.startsWith('app_submit:')) return;

    await interaction.deferReply({ ephemeral: true });

    const applicationId = parseInt(interaction.customId.split(':')[1], 10);
    const application = await repo.getApplication(applicationId);

    if (!application) {
      await interaction.editReply({ content: 'Application not found.' });
      return;
    }

    if (application.applicant_id !== interaction.user.id) {
      await interaction.editReply({ content: 'This is not your application.' });
      return;
    }

    if (application.status !== 'DRAFT') {
      await interaction.editReply({ content: 'Application is no longer in draft status.' });
      return;
    }

    const questions = getQuestions(application.type);
    const answers = questions.map((q) => ({
      questionId: q.id,
      answer: interaction.fields.getTextInputValue(q.id) || '',
    }));

    const result = await submitApplication(application, answers, repo);
    await interaction.editReply({ content: result.message });
  }

  private async handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const applicationId = interaction.options.getInteger('application_id');

    let application;
    if (applicationId) {
      application = await repo.getApplication(applicationId);
      if (application && application.applicant_id !== interaction.user.id) {
        const member = interaction.member as GuildMember;
        if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.editReply({ content: 'This is not your application.' });
          return;
        }
      }
    } else {
      const apps = await repo.getApplicantApplications(interaction.guildId!, interaction.user.id);
      application = apps[0] || null;
    }

    if (!application) {
      await interaction.editReply({ content: 'No application found.' });
      return;
    }

    const embed = await getApplicationInfo(application, repo);
    await interaction.editReply({ embeds: [embed] });
  }

  private async handleWithdraw(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const applicationId = interaction.options.getInteger('application_id', true);
    const application = await repo.getApplication(applicationId);

    if (!application) {
      await interaction.editReply({ content: 'Application not found.' });
      return;
    }

    if (application.applicant_id !== interaction.user.id) {
      await interaction.editReply({ content: 'This is not your application.' });
      return;
    }

    const result = await withdrawApplication(application, repo);
    await interaction.editReply({ content: result.message });
  }

  private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const status = interaction.options.getString('status') || undefined;
    const type = interaction.options.getString('type') || undefined;

    const applications = await repo.listGuildApplications(interaction.guildId!, status, type);

    if (applications.length === 0) {
      await interaction.editReply({ content: 'No applications found.' });
      return;
    }

    const lines = applications.slice(0, 25).map((a) => {
      const statusIcon = a.status === 'APPROVED' ? '✅' : a.status === 'REJECTED' ? '❌' : a.status === 'SUBMITTED' ? '📥' : '📝';
      return `${statusIcon} **#${a.id}** — <@${a.applicant_id}> — ${a.type} — ${a.status}`;
    });

    await interaction.editReply({ content: lines.join('\n') });
  }

  private async handleReview(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const applicationId = interaction.options.getInteger('application_id', true);
    const application = await repo.getApplication(applicationId);

    if (!application) {
      await interaction.editReply({ content: 'Application not found.' });
      return;
    }

    const embed = await getApplicationInfo(application, repo);
    await interaction.editReply({ embeds: [embed] });
  }

  private async handleApprove(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const applicationId = interaction.options.getInteger('application_id', true);
    const application = await repo.getApplication(applicationId);

    if (!application) {
      await interaction.editReply({ content: 'Application not found.' });
      return;
    }

    const result = await approveApplication(application, interaction.user.id, repo);
    await interaction.editReply({ content: result.message });
  }

  private async handleReject(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const applicationId = interaction.options.getInteger('application_id', true);
    const reason = interaction.options.getString('reason', true);
    const application = await repo.getApplication(applicationId);

    if (!application) {
      await interaction.editReply({ content: 'Application not found.' });
      return;
    }

    const result = await rejectApplication(application, interaction.user.id, reason, repo);
    await interaction.editReply({ content: result.message });
  }
}
