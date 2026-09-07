import { Colors, EmbedBuilder, APIEmbedField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { PollRepository } from '../../database/repositories/PollRepository';
import {
  PollRow,
  PollStatus,
  PollOptionRow,
  PollVoteRow,
  PollResult,
} from '../../database/schema';
import { logger, logError } from '../../utils/logger';
import {
  MissingPermissionsError,
  ValidationError,
  DatabaseQueryError,
  BusinessRuleError,
} from '../../utils/errors';

const pollTimers = new Map<string, NodeJS.Timeout>();

const pollRepository = new PollRepository();

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;
const MAX_OPTION_LENGTH = 255;
const MAX_QUESTION_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1024;

function getStatusEmoji(status: PollStatus): string {
  switch (status) {
    case 'ACTIVE': return '🟢';
    case 'ENDED': return '🔴';
    case 'CANCELLED': return '⛔';
  }
}

function getPollColor(status: PollStatus): number {
  switch (status) {
    case 'ACTIVE': return Colors.Blue;
    case 'ENDED': return Colors.Gold;
    case 'CANCELLED': return Colors.Greyple;
  }
}

function buildPollEmbed(
  poll: PollRow,
  options: PollOptionRow[],
  results: PollResult[]
): EmbedBuilder {
  const fields: APIEmbedField[] = [];

  for (const result of results) {
    const barLength = 20;
    const filled = result.percentage > 0 ? Math.round((result.percentage / 100) * barLength) : 0;
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    fields.push({
      name: `${result.option.option_index + 1}. ${result.option.option_text}`,
      value: `\`${bar}\` **${result.voteCount}** vote(s) (${result.percentage.toFixed(1)}%)`,
      inline: false,
    });
  }

  const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);
  const uniqueVoters = new Set(results.flatMap(r => r.voters)).size;

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${poll.question}`)
    .setDescription(poll.description || null)
    .setColor(getPollColor(poll.status))
    .addFields(fields)
    .setFooter({
      text: `${getStatusEmoji(poll.status)} ${poll.status} | ${totalVotes} vote(s) | ${uniqueVoters} voter(s) | ID: ${poll.id}`,
    })
    .setTimestamp();

  if (poll.ends_at) {
    embed.addFields({
      name: '⏰ Ends',
      value: `<t:${Math.floor(new Date(poll.ends_at).getTime() / 1000)}:R>`,
      inline: true,
    });
  }

  embed.addFields({
    name: '👤 Creator',
    value: `<@${poll.creator_id}>`,
    inline: true,
  });

  if (poll.multiple_choice) {
    embed.addFields({
      name: '📋 Mode',
      value: 'Multiple Choice',
      inline: true,
    });
  }

  if (poll.anonymous) {
    embed.addFields({
      name: '🔒 Mode',
      value: 'Anonymous',
      inline: true,
    });
  }

  return embed;
}

function buildVoteButtons(
  pollId: number,
  options: PollOptionRow[],
  userVotes: PollVoteRow[]
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const votedOptionIds = new Set(userVotes.map(v => v.option_id));

  for (let i = 0; i < options.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    const slice = options.slice(i, i + 5);

    for (const option of slice) {
      const hasVoted = votedOptionIds.has(option.id);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll:vote:${pollId}:${option.id}`)
          .setLabel(`${option.option_index + 1}. ${option.option_text.substring(0, 80)}`)
          .setStyle(hasVoted ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(false)
      );
    }

    rows.push(row);
  }

  if (options.length > 0) {
    const removeRow = new ActionRowBuilder<ButtonBuilder>();
    removeRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`poll:remove:${pollId}`)
        .setLabel('Oyu Kaldır')
        .setEmoji('🗳️')
        .setStyle(ButtonStyle.Danger)
    );
    rows.push(removeRow);
  }

  return rows;
}

export async function createPoll(params: {
  guildId: string;
  channelId: string;
  creatorId: string;
  userBot?: boolean;
  hasManageGuild?: boolean;
  question: string;
  description?: string;
  options: string[];
  multipleChoice?: boolean;
  anonymous?: boolean;
  endsAt?: string;
}): Promise<{ poll: PollRow; options: PollOptionRow[] }> {
  if (params.userBot) {
    throw new MissingPermissionsError('Bots cannot create polls');
  }

  if (!params.hasManageGuild) {
    throw new MissingPermissionsError('Manage Guild permission required to create polls');
  }

  if (!params.question || params.question.trim().length === 0) {
    throw new ValidationError('Poll question is required');
  }

  if (params.question.length > MAX_QUESTION_LENGTH) {
    throw new ValidationError(`Poll question must be ${MAX_QUESTION_LENGTH} characters or less`);
  }

  if (params.description && params.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(`Poll description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
  }

  if (params.options.length < MIN_OPTIONS) {
    throw new ValidationError(`Poll must have at least ${MIN_OPTIONS} options`);
  }

  if (params.options.length > MAX_OPTIONS) {
    throw new ValidationError(`Poll must have ${MAX_OPTIONS} options or fewer`);
  }

  for (let i = 0; i < params.options.length; i++) {
    if (!params.options[i] || params.options[i].trim().length === 0) {
      throw new ValidationError(`Option ${i + 1} cannot be empty`);
    }
    if (params.options[i].length > MAX_OPTION_LENGTH) {
      throw new ValidationError(`Option ${i + 1} must be ${MAX_OPTION_LENGTH} characters or less`);
    }
  }

  if (params.endsAt) {
    const endDate = new Date(params.endsAt);
    if (endDate <= new Date()) {
      throw new ValidationError('Poll end time must be in the future');
    }
  }

  const poll = await pollRepository.createPoll({
    guild_id: params.guildId,
    channel_id: params.channelId,
    creator_id: params.creatorId,
    question: params.question,
    description: params.description,
    multiple_choice: params.multipleChoice || false,
    anonymous: params.anonymous || false,
    ends_at: params.endsAt,
  });

  const options: PollOptionRow[] = [];
  for (let i = 0; i < params.options.length; i++) {
    const option = await pollRepository.addOption({
      poll_id: poll.id,
      guild_id: params.guildId,
      option_index: i,
      option_text: params.options[i],
    });
    options.push(option);
  }

  logger.info({
    guildId: params.guildId,
    pollId: poll.id,
    creatorId: params.creatorId,
    optionCount: options.length,
    action: 'POLL_CREATED',
  }, 'Poll created');

  if (poll.ends_at) {
    schedulePollTimer(poll);
  }

  return { poll, options };
}

export async function getPollById(pollId: number, guildId: string): Promise<PollRow> {
  const poll = await pollRepository.getPoll(pollId);
  if (!poll) {
    throw new BusinessRuleError('Poll not found');
  }
  if (poll.guild_id !== guildId) {
    throw new BusinessRuleError('Poll not found');
  }
  return poll;
}

export async function listPollsByGuild(
  guildId: string,
  status?: string
): Promise<PollRow[]> {
  return pollRepository.getPollsByGuild(guildId, status, 15);
}

export async function vote(
  pollId: number,
  guildId: string,
  userId: string,
  optionId: number,
  userBot?: boolean
): Promise<{ poll: PollRow; options: PollOptionRow[]; results: PollResult[] }> {
  if (userBot) {
    throw new MissingPermissionsError('Bots cannot vote');
  }

  const poll = await getPollById(pollId, guildId);

  if (poll.status !== 'ACTIVE') {
    throw new BusinessRuleError('This poll is no longer active');
  }

  if (poll.ends_at && new Date(poll.ends_at) <= new Date()) {
    const ended = await pollRepository.endPoll(pollId);
    if (ended) {
      throw new BusinessRuleError('This poll has expired');
    }
  }

  const options = await pollRepository.getOptions(pollId);
  const validOption = options.find(o => o.id === optionId);
  if (!validOption) {
    throw new BusinessRuleError('Invalid option for this poll');
  }

  if (!poll.multiple_choice) {
    const existingVotes = await pollRepository.getUserVotes(pollId, userId);
    if (existingVotes.length > 0) {
      const existingOptionId = existingVotes[0].option_id;
      if (existingOptionId === optionId) {
        throw new BusinessRuleError('You have already voted for this option');
      }

      await pollRepository.removeUserVotes(pollId, userId);

      logger.info({
        guildId,
        pollId,
        userId,
        optionId,
        action: 'POLL_VOTE_REMOVED',
      }, 'Poll vote removed (switch)');
    }
  }

  try {
    await pollRepository.addVote({
      poll_id: pollId,
      option_id: optionId,
      guild_id: guildId,
      user_id: userId,
    });
  } catch (error) {
    if (
      error instanceof DatabaseQueryError &&
      error.message.includes('ALREADY_VOTED')
    ) {
      throw new BusinessRuleError('You have already voted for this option');
    }
    throw error;
  }

  logger.info({
    guildId,
    pollId,
    userId,
    optionId,
    action: 'POLL_VOTED',
  }, 'Poll voted');

  const updatedResults = await getPollResults(pollId, guildId);
  return { poll, options, results: updatedResults };
}

export async function removeVote(
  pollId: number,
  guildId: string,
  userId: string,
  optionId?: number
): Promise<{ poll: PollRow; options: PollOptionRow[]; results: PollResult[] }> {
  const poll = await getPollById(pollId, guildId);

  if (poll.status !== 'ACTIVE') {
    throw new BusinessRuleError('This poll is no longer active');
  }

  if (optionId) {
    const removed = await pollRepository.removeVote(pollId, optionId, userId);
    if (!removed) {
      throw new BusinessRuleError('You have not voted for this option');
    }
  } else {
    const removedCount = await pollRepository.removeUserVotes(pollId, userId);
    if (removedCount === 0) {
      throw new BusinessRuleError('You have not voted in this poll');
    }
  }

  logger.info({
    guildId,
    pollId,
    userId,
    action: 'POLL_VOTE_REMOVED',
  }, 'Poll vote removed');

  const results = await getPollResults(pollId, guildId);
  const options = await pollRepository.getOptions(pollId);
  return { poll, options, results };
}

export async function endPoll(
  pollId: number,
  guildId: string,
  userId: string,
  hasManageGuild: boolean,
  botOwners: string[]
): Promise<PollRow> {
  const poll = await getPollById(pollId, guildId);

  if (poll.status !== 'ACTIVE') {
    throw new BusinessRuleError('This poll is already ended or cancelled');
  }

  const isCreator = poll.creator_id === userId;
  const isPrivileged = hasManageGuild || botOwners.includes(userId);

  if (!isCreator && !isPrivileged) {
    throw new MissingPermissionsError('Only the poll creator or users with Manage Server can end this poll');
  }

  const ended = await pollRepository.endPoll(pollId);
  if (!ended) {
    throw new BusinessRuleError('This poll has already been ended');
  }

  clearPollTimer(pollId);

  logger.info({
    guildId,
    pollId,
    userId,
    action: 'POLL_ENDED',
  }, 'Poll ended');

  return ended;
}

export async function cancelPoll(
  pollId: number,
  guildId: string,
  hasManageGuild: boolean
): Promise<PollRow> {
  if (!hasManageGuild) {
    throw new MissingPermissionsError('Manage Guild permission required to cancel polls');
  }

  const poll = await getPollById(pollId, guildId);

  if (poll.status === 'ENDED' || poll.status === 'CANCELLED') {
    throw new BusinessRuleError('Poll is already ended or cancelled');
  }

  const cancelled = await pollRepository.cancelPoll(pollId);
  if (!cancelled) {
    throw new BusinessRuleError('Poll has already been cancelled');
  }

  clearPollTimer(pollId);

  logger.info({
    guildId,
    pollId,
    action: 'POLL_CANCELLED',
  }, 'Poll cancelled');

  return cancelled;
}

export async function getPollResults(
  pollId: number,
  guildId: string
): Promise<PollResult[]> {
  await getPollById(pollId, guildId);

  const options = await pollRepository.getOptions(pollId);
  const votes = await pollRepository.getVotes(pollId);

  const totalVotes = votes.length;

  const results: PollResult[] = options.map(option => {
    const optionVotes = votes.filter(v => v.option_id === option.id);
    const voteCount = optionVotes.length;
    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
    const voters = optionVotes.map(v => v.user_id);

    return {
      option,
      voteCount,
      percentage,
      voters,
    };
  });

  logger.info({
    guildId,
    pollId,
    action: 'POLL_RESULTS_VIEWED',
  }, 'Poll results viewed');

  return results;
}

function schedulePollTimer(poll: PollRow): void {
  if (!poll.ends_at) return;

  const now = new Date();
  const endsAt = new Date(poll.ends_at);
  const delay = endsAt.getTime() - now.getTime();

  if (delay <= 0) return;
  if (pollTimers.has(String(poll.id))) return;

  const timer = setTimeout(async () => {
    try {
      const p = await pollRepository.getPoll(poll.id);
      if (p && p.status === 'ACTIVE' && p.guild_id === poll.guild_id) {
        await pollRepository.endPoll(poll.id);
        logger.info({
          guildId: poll.guild_id,
          pollId: poll.id,
          action: 'POLL_ENDED_BY_TIMER',
        }, 'Poll ended by timer');
      }
    } catch (err) {
      logError(`Error ending poll ${poll.id} via timer`, err);
    } finally {
      pollTimers.delete(String(poll.id));
    }
  }, delay);

  timer.unref();
  pollTimers.set(String(poll.id), timer);
}

function clearPollTimer(pollId: number): void {
  const key = String(pollId);
  if (pollTimers.has(key)) {
    clearTimeout(pollTimers.get(key)!);
    pollTimers.delete(key);
  }
}

export async function restorePollTimers(): Promise<void> {
  try {
    const polls = await pollRepository.getActivePolls();
    const now = new Date();

    for (const poll of polls) {
      if (!poll.ends_at) continue;

      const endsAt = new Date(poll.ends_at);
      if (endsAt <= now) {
        const ended = await pollRepository.endPoll(poll.id);
        if (ended) {
          logger.info({
            guildId: poll.guild_id,
            pollId: poll.id,
            action: 'POLL_ENDED_ON_RESTORE',
          }, 'Poll ended on restore');
        }
      } else {
        schedulePollTimer(poll);
      }
    }
  } catch (error) {
    logError('Error restoring poll timers', error);
  }
}

export function buildPollEmbedBuilder(
  poll: PollRow,
  options: PollOptionRow[],
  results: PollResult[]
): EmbedBuilder {
  return buildPollEmbed(poll, options, results);
}

export function buildPollVoteButtons(
  pollId: number,
  options: PollOptionRow[],
  userVotes: PollVoteRow[]
): ActionRowBuilder<ButtonBuilder>[] {
  return buildVoteButtons(pollId, options, userVotes);
}
