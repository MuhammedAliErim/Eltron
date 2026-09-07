import { TextChannel } from 'discord.js';
import { ReminderRepository } from '../../database/repositories/ReminderRepository';
import { ReminderRow } from '../../database/schema';
import { logger, logError } from '../../utils/logger';
import {
  MissingPermissionsError,
  BusinessRuleError,
  ValidationError,
} from '../../utils/errors';

let botClient: import('discord.js').Client | null = null;

const reminderTimers = new Map<string, NodeJS.Timeout>();

const reminderRepository = new ReminderRepository();

const MAX_ACTIVE_REMINDERS = 20;
const MIN_REMINDER_MS = 10 * 1000;
const MAX_REMINDER_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 2000;

const DURATION_REGEX = /^(\d+)(s|m|h|d|w)$/;
const MULTIPLIERS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

export function parseReminderDuration(input: string): number | null {
  const match = input.toLowerCase().trim().match(DURATION_REGEX);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];
  return value * MULTIPLIERS[unit];
}

export async function createReminder(params: {
  guildId: string;
  channelId: string;
  userId: string;
  userBot?: boolean;
  message: string;
  durationMs: number;
}): Promise<ReminderRow> {
  if (params.userBot) {
    throw new MissingPermissionsError('Bots cannot create reminders');
  }

  if (!params.guildId) {
    throw new BusinessRuleError('Reminders can only be created in a server');
  }

  if (!params.message || params.message.trim().length === 0) {
    throw new ValidationError('Reminder message is required');
  }

  if (params.message.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError(`Reminder message must be ${MAX_MESSAGE_LENGTH} characters or less`);
  }

  if (params.durationMs < MIN_REMINDER_MS) {
    throw new ValidationError('Minimum reminder time is 10 seconds');
  }

  if (params.durationMs > MAX_REMINDER_MS) {
    throw new ValidationError('Maximum reminder time is 365 days');
  }

  const activeCount = await reminderRepository.countActiveReminders(params.userId, params.guildId);
  if (activeCount >= MAX_ACTIVE_REMINDERS) {
    throw new BusinessRuleError(`You have reached the maximum of ${MAX_ACTIVE_REMINDERS} active reminders`);
  }

  const remindAt = new Date(Date.now() + params.durationMs).toISOString();

  const reminder = await reminderRepository.createReminder({
    guild_id: params.guildId,
    user_id: params.userId,
    channel_id: params.channelId,
    message: params.message,
    remind_at: remindAt,
  });

  logger.info({
    guildId: params.guildId,
    userId: params.userId,
    reminderId: reminder.id,
    action: 'REMINDER_CREATED',
  }, 'Reminder created');

  scheduleReminderTimer(reminder);

  return reminder;
}

export async function getReminderById(reminderId: number, userId: string): Promise<ReminderRow> {
  const reminder = await reminderRepository.getReminder(reminderId);
  if (!reminder) {
    throw new BusinessRuleError('Reminder not found');
  }
  if (reminder.user_id !== userId) {
    throw new BusinessRuleError('Reminder not found');
  }
  return reminder;
}

export async function listUserReminders(
  userId: string,
  guildId: string
): Promise<ReminderRow[]> {
  return reminderRepository.getUserReminders(userId, guildId, 'PENDING');
}

export async function cancelReminder(
  reminderId: number,
  userId: string
): Promise<ReminderRow> {
  const reminder = await getReminderById(reminderId, userId);

  if (reminder.status !== 'PENDING') {
    throw new BusinessRuleError('This reminder has already been cancelled or triggered');
  }

  const cancelled = await reminderRepository.cancelReminder(reminderId);
  if (!cancelled) {
    throw new BusinessRuleError('This reminder has already been cancelled or triggered');
  }

  clearReminderTimer(reminderId);

  logger.info({
    guildId: reminder.guild_id,
    userId,
    reminderId,
    action: 'REMINDER_CANCELLED',
  }, 'Reminder cancelled');

  return cancelled;
}

export async function triggerReminder(
  reminderId: number,
  client: import('discord.js').Client
): Promise<void> {
  const reminder = await reminderRepository.getReminder(reminderId);
  if (!reminder) return;

  if (reminder.status !== 'PENDING') return;

  const now = new Date();
  const remindAt = new Date(reminder.remind_at);
  if (remindAt > now) return;

  try {
    const channel = await client.channels.fetch(reminder.channel_id);
    if (channel && channel.isTextBased() && !channel.isDMBased()) {
      const textChannel = channel as TextChannel;
      await textChannel.send({
        content: `⏰ <@${reminder.user_id}>\n\n> ${reminder.message}`,
      });
    }

    await reminderRepository.markTriggered(reminderId);

    logger.info({
      guildId: reminder.guild_id,
      userId: reminder.user_id,
      reminderId,
      action: 'REMINDER_TRIGGERED',
    }, 'Reminder triggered');
  } catch (error) {
    logError(`Error triggering reminder ${reminderId}`, error);

    await reminderRepository.markTriggered(reminderId).catch(() => {});

    logger.warn({
      guildId: reminder.guild_id,
      userId: reminder.user_id,
      reminderId,
      action: 'REMINDER_FAILED',
    }, 'Reminder failed to send');
  } finally {
    reminderTimers.delete(String(reminderId));
  }
}

function scheduleReminderTimer(reminder: ReminderRow): void {
  const now = new Date();
  const remindAt = new Date(reminder.remind_at);
  const delay = remindAt.getTime() - now.getTime();

  if (delay <= 0) return;
  if (reminderTimers.has(String(reminder.id))) return;

  const timer = setTimeout(async () => {
    try {
      const r = await reminderRepository.getReminder(reminder.id);
      if (r && r.status === 'PENDING' && botClient) {
        await triggerReminder(reminder.id, botClient);
      } else {
        reminderTimers.delete(String(reminder.id));
      }
    } catch (err) {
      logError(`Error in reminder timer for ${reminder.id}`, err);
      reminderTimers.delete(String(reminder.id));
    }
  }, delay);

  timer.unref();
  reminderTimers.set(String(reminder.id), timer);
}

function clearReminderTimer(reminderId: number): void {
  const key = String(reminderId);
  if (reminderTimers.has(key)) {
    clearTimeout(reminderTimers.get(key)!);
    reminderTimers.delete(key);
  }
}

export async function restoreReminderTimers(
  client: import('discord.js').Client
): Promise<void> {
  botClient = client;
  try {
    const reminders = await reminderRepository.getPendingReminders();
    const now = new Date();

    for (const reminder of reminders) {
      const remindAt = new Date(reminder.remind_at);
      if (remindAt <= now) {
        await triggerReminder(reminder.id, client);
      } else {
        scheduleReminderTimerWithClient(reminder, client);
      }
    }
  } catch (error) {
    logError('Error restoring reminder timers', error);
  }
}

function scheduleReminderTimerWithClient(
  reminder: ReminderRow,
  client: import('discord.js').Client
): void {
  const now = new Date();
  const remindAt = new Date(reminder.remind_at);
  const delay = remindAt.getTime() - now.getTime();

  if (delay <= 0) return;
  if (reminderTimers.has(String(reminder.id))) return;

  const timer = setTimeout(async () => {
    try {
      const r = await reminderRepository.getReminder(reminder.id);
      if (r && r.status === 'PENDING') {
        await triggerReminder(reminder.id, client);
      } else {
        reminderTimers.delete(String(reminder.id));
      }
    } catch (err) {
      logError(`Error in reminder timer for ${reminder.id}`, err);
      reminderTimers.delete(String(reminder.id));
    }
  }, delay);

  timer.unref();
  reminderTimers.set(String(reminder.id), timer);
}
