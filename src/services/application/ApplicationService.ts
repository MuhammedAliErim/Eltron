import { EmbedBuilder, Colors } from 'discord.js';
import {
  ApplicationRow,
  ApplicationStatus,
  ApplicationType,
  ApplicationQuestion,
  ApplicationAnswerCreate,
} from '../../database/schema';
import { ApplicationRepository } from '../../database/repositories/ApplicationRepository';
import { logger } from '../../utils/logger';

const APPLICATION_QUESTIONS: Record<ApplicationType, ApplicationQuestion[]> = {
  STAFF: [
    { id: 'staff_experience', type: 'LONG_TEXT', question: 'Do you have prior moderation/staff experience? Describe.', required: true, maxLength: 1000, order: 1 },
    { id: 'staff_availability', type: 'SHORT_TEXT', question: 'How many hours per week can you dedicate?', required: true, maxLength: 100, order: 2 },
    { id: 'staff_reason', type: 'LONG_TEXT', question: 'Why do you want to be staff on this server?', required: true, maxLength: 1000, order: 3 },
    { id: 'staff_scenario', type: 'LONG_TEXT', question: 'A user is spamming in general chat. What do you do?', required: false, maxLength: 1000, order: 4 },
  ],
  FAMILY: [
    { id: 'family_server_name', type: 'SHORT_TEXT', question: 'What is your server name?', required: true, maxLength: 100, order: 1 },
    { id: 'family_member_count', type: 'NUMBER', question: 'How many members does your server have?', required: true, maxLength: 10, order: 2 },
    { id: 'family_reason', type: 'LONG_TEXT', question: 'Why do you want to partner with us?', required: true, maxLength: 1000, order: 3 },
    { id: 'family_link', type: 'SHORT_TEXT', question: 'Invite link to your server', required: true, maxLength: 200, order: 4 },
  ],
  PARTNERSHIP: [
    { id: 'partner_type', type: 'SHORT_TEXT', question: 'What type of partnership are you proposing?', required: true, maxLength: 200, order: 1 },
    { id: 'partner_details', type: 'LONG_TEXT', question: 'Describe the partnership proposal in detail.', required: true, maxLength: 1000, order: 2 },
    { id: 'partner_audience', type: 'SHORT_TEXT', question: 'What is your target audience?', required: true, maxLength: 200, order: 3 },
  ],
  OTHER: [
    { id: 'other_subject', type: 'SHORT_TEXT', question: 'What is this application about?', required: true, maxLength: 200, order: 1 },
    { id: 'other_details', type: 'LONG_TEXT', question: 'Please provide details.', required: true, maxLength: 1000, order: 2 },
  ],
};

const TYPE_LABELS: Record<ApplicationType, string> = {
  STAFF: 'Staff Application',
  FAMILY: 'Family Application',
  PARTNERSHIP: 'Partnership Application',
  OTHER: 'Other Application',
};

const STATUS_COLORS: Record<ApplicationStatus, number> = {
  DRAFT: Colors.Grey,
  SUBMITTED: Colors.Blue,
  UNDER_REVIEW: Colors.Gold,
  APPROVED: Colors.Green,
  REJECTED: Colors.Red,
  WITHDRAWN: Colors.Default,
};

const canWithdraw = (status: ApplicationStatus): boolean =>
  status === 'DRAFT' || status === 'SUBMITTED';

const canReview = (status: ApplicationStatus): boolean =>
  status === 'SUBMITTED' || status === 'UNDER_REVIEW';

export const getQuestions = (type: ApplicationType): ApplicationQuestion[] => {
  return APPLICATION_QUESTIONS[type] || APPLICATION_QUESTIONS.OTHER;
};

export const validateAnswers = (
  type: ApplicationType,
  answers: { questionId: string; answer: string }[]
): { valid: boolean; errors: string[] } => {
  const questions = getQuestions(type);
  const errors: string[] = [];
  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));

  for (const q of questions) {
    const answer = answerMap.get(q.id) || '';

    if (q.required && (!answer || answer.trim().length === 0)) {
      errors.push(`Question "${q.question}" is required.`);
      continue;
    }

    if (answer.length > q.maxLength) {
      errors.push(`Answer for "${q.question}" exceeds max length of ${q.maxLength}.`);
    }

    if (q.type === 'NUMBER' && answer && isNaN(Number(answer))) {
      errors.push(`Answer for "${q.question}" must be a number.`);
    }

    if (q.type === 'BOOLEAN' && answer && !['true', 'false', 'yes', 'no'].includes(answer.toLowerCase())) {
      errors.push(`Answer for "${q.question}" must be yes/no or true/false.`);
    }
  }

  return { valid: errors.length === 0, errors };
};

export const createApplication = async (
  guildId: string,
  applicantId: string,
  type: ApplicationType,
  repo: ApplicationRepository
): Promise<{
  success: boolean;
  application?: ApplicationRow;
  message: string;
}> => {
  const existing = await repo.getActiveApplicationByType(guildId, applicantId, type);
  if (existing) {
    return {
      success: false,
      message: `You already have an active ${TYPE_LABELS[type]} (ID: ${existing.id}).`,
    };
  }

  const application = await repo.createApplication({
    guild_id: guildId,
    applicant_id: applicantId,
    type,
  });

  logger.info({
    guildId,
    applicationId: application.id,
    applicantId,
    type,
  }, 'Application created');

  return {
    success: true,
    application,
    message: `${TYPE_LABELS[type]} created (ID: ${application.id}). Answer the questions to submit.`,
  };
};

export const submitApplication = async (
  application: ApplicationRow,
  answers: { questionId: string; answer: string }[],
  repo: ApplicationRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  if (application.status !== 'DRAFT') {
    return { success: false, message: 'Application is not in draft status.' };
  }

  const validation = validateAnswers(application.type, answers);
  if (!validation.valid) {
    return {
      success: false,
      message: `Validation errors:\n${validation.errors.join('\n')}`,
    };
  }

  const answerCreates: ApplicationAnswerCreate[] = answers
    .filter((a) => a.answer.trim().length > 0)
    .map((a) => ({
      application_id: application.id,
      question_id: a.questionId,
      answer: a.answer.substring(0, 1000),
    }));

  await repo.saveAnswers(answerCreates);

  const submitted = await repo.submitApplication(application.id);

  if (!submitted) {
    return { success: false, message: 'Failed to submit application.' };
  }

  logger.info({
    guildId: application.guild_id,
    applicationId: application.id,
    applicantId: application.applicant_id,
    type: application.type,
  }, 'Application submitted');

  return { success: true, message: 'Application submitted successfully!' };
};

export const approveApplication = async (
  application: ApplicationRow,
  reviewedBy: string,
  repo: ApplicationRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  if (!canReview(application.status)) {
    return { success: false, message: `Cannot approve application in ${application.status} status.` };
  }

  const approved = await repo.approveApplication(application.id, reviewedBy);

  if (!approved) {
    return { success: false, message: 'Failed to approve application. It may have been reviewed already.' };
  }

  logger.info({
    guildId: application.guild_id,
    applicationId: application.id,
    applicantId: application.applicant_id,
    reviewedBy,
  }, 'Application approved');

  return { success: true, message: 'Application approved.' };
};

export const rejectApplication = async (
  application: ApplicationRow,
  reviewedBy: string,
  reason: string,
  repo: ApplicationRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  if (!canReview(application.status)) {
    return { success: false, message: `Cannot reject application in ${application.status} status.` };
  }

  const rejected = await repo.rejectApplication(application.id, reviewedBy, reason);

  if (!rejected) {
    return { success: false, message: 'Failed to reject application. It may have been reviewed already.' };
  }

  logger.info({
    guildId: application.guild_id,
    applicationId: application.id,
    applicantId: application.applicant_id,
    reviewedBy,
  }, 'Application rejected');

  return { success: true, message: 'Application rejected.' };
};

export const withdrawApplication = async (
  application: ApplicationRow,
  repo: ApplicationRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  if (!canWithdraw(application.status)) {
    return { success: false, message: `Cannot withdraw application in ${application.status} status.` };
  }

  const withdrawn = await repo.withdrawApplication(application.id);

  if (!withdrawn) {
    return { success: false, message: 'Failed to withdraw application.' };
  }

  logger.info({
    guildId: application.guild_id,
    applicationId: application.id,
    applicantId: application.applicant_id,
  }, 'Application withdrawn');

  return { success: true, message: 'Application withdrawn.' };
};

export const getApplicationInfo = async (
  application: ApplicationRow,
  repo: ApplicationRepository
): Promise<EmbedBuilder> => {
  const answers = await repo.getAnswers(application.id);
  const questions = getQuestions(application.type);
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const embed = new EmbedBuilder()
    .setTitle(`${TYPE_LABELS[application.type]} #${application.id}`)
    .setColor(STATUS_COLORS[application.status] || Colors.Default)
    .addFields(
      { name: 'Status', value: application.status, inline: true },
      { name: 'Applicant', value: `<@${application.applicant_id}>`, inline: true },
      { name: 'Type', value: application.type, inline: true },
    )
    .setTimestamp(new Date(application.created_at));

  if (application.submitted_at) {
    embed.addFields({ name: 'Submitted', value: `<t:${Math.floor(new Date(application.submitted_at).getTime() / 1000)}:R>`, inline: true });
  }

  if (application.reviewed_by) {
    embed.addFields({ name: 'Reviewed By', value: `<@${application.reviewed_by}>`, inline: true });
  }

  if (application.review_reason) {
    embed.addFields({ name: 'Reason', value: application.review_reason.substring(0, 1024) });
  }

  if (answers.length > 0) {
    const answerLines = answers.map((a) => {
      const q = questionMap.get(a.question_id);
      const label = q ? q.question : a.question_id;
      return `**${label}:** ${a.answer.substring(0, 300)}`;
    });
    embed.addFields({ name: 'Answers', value: answerLines.join('\n\n').substring(0, 4000) || 'No answers' });
  }

  return embed;
};
