import { TextChannel } from 'discord.js';
import { ScheduledTaskRepository, ScheduledTaskRow } from '../../database/repositories/ScheduledTaskRepository';
import { logger, logError } from '../../utils/logger';

let botClient: import('discord.js').Client | null = null;

const taskTimers = new Map<string, NodeJS.Timeout>();

const taskRepository = new ScheduledTaskRepository();

const TASK_TYPES = ['backup', 'reminder', 'announce', 'cleanup'] as const;

type TaskType = typeof TASK_TYPES[number];

function isValidTaskType(type: string): type is TaskType {
  return (TASK_TYPES as readonly string[]).includes(type);
}

function calculateNextRun(intervalMs: number): Date {
  return new Date(Date.now() + intervalMs);
}

async function executeTask(task: ScheduledTaskRow): Promise<void> {
  try {
    const nextRun = task.interval_ms ? calculateNextRun(task.interval_ms) : null;

    switch (task.type) {
      case 'backup': {
        logger.info({
          taskId: task.id,
          guildId: task.guild_id,
          type: task.type,
          action: 'TASK_EXECUTED',
        }, `Scheduled backup executed for guild ${task.guild_id}`);
        break;
      }

      case 'reminder': {
        if (!botClient) break;
        const config = task.config as Record<string, unknown>;
        const channelId = config.channel_id as string | undefined;
        if (!channelId) break;

        try {
          const channel = await botClient.channels.fetch(channelId);
          if (channel && channel.isTextBased() && !channel.isDMBased()) {
            const textChannel = channel as TextChannel;
            const message = (config.message as string) || 'Scheduled reminder';
            await textChannel.send({ content: `📢 **Scheduled Reminder**: ${message}` });
          }
        } catch (err) {
          logError(`Failed to send reminder for task ${task.id}`, err);
        }
        break;
      }

      case 'announce': {
        if (!botClient) break;
        const config = task.config as Record<string, unknown>;
        const channelId = config.channel_id as string | undefined;
        if (!channelId) break;

        try {
          const channel = await botClient.channels.fetch(channelId);
          if (channel && channel.isTextBased() && !channel.isDMBased()) {
            const textChannel = channel as TextChannel;
            const message = (config.message as string) || 'Scheduled announcement';
            await textChannel.send({ content: `📣 **Announcement**: ${message}` });
          }
        } catch (err) {
          logError(`Failed to send announcement for task ${task.id}`, err);
        }
        break;
      }

      case 'cleanup': {
        logger.info({
          taskId: task.id,
          guildId: task.guild_id,
          type: task.type,
          action: 'TASK_EXECUTED',
        }, `Scheduled cleanup executed for guild ${task.guild_id}`);
        break;
      }

      default:
        logger.warn({ taskId: task.id, type: task.type }, 'Unknown task type');
        return;
    }

    const now = new Date().toISOString();
    await taskRepository.updateLastRun(task.id, now, nextRun ? nextRun.toISOString() : now);

    logger.info({
      taskId: task.id,
      guildId: task.guild_id,
      type: task.type,
      action: 'TASK_COMPLETED',
    }, `Scheduled task completed: ${task.name}`);
  } catch (error) {
    logError(`Error executing scheduled task ${task.id}`, error);
  }
}

function startTask(task: ScheduledTaskRow): void {
  if (!task.enabled) return;
  if (!task.interval_ms) return;
  if (taskTimers.has(task.id)) return;

  const timer = setInterval(() => {
    executeTask(task);
  }, task.interval_ms);

  taskTimers.set(task.id, timer);

  logger.info({
    taskId: task.id,
    guildId: task.guild_id,
    type: task.type,
    intervalMs: task.interval_ms,
    action: 'TASK_STARTED',
  }, `Scheduled task started: ${task.name}`);
}

function stopTask(taskId: string): void {
  if (taskTimers.has(taskId)) {
    clearInterval(taskTimers.get(taskId)!);
    taskTimers.delete(taskId);

    logger.info({ taskId, action: 'TASK_STOPPED' }, 'Scheduled task stopped');
  }
}

function isTaskRunning(taskId: string): boolean {
  return taskTimers.has(taskId);
}

export async function restoreScheduledTasks(): Promise<void> {
  try {
    const tasks = await taskRepository.getEnabledTasks();

    for (const task of tasks) {
      if (task.interval_ms) {
        startTask(task);
      }
    }

    logger.info({ count: tasks.length, action: 'TASKS_RESTORED' }, 'Scheduled tasks restored');
  } catch (error) {
    logError('Error restoring scheduled tasks', error);
  }
}

export function setTaskClient(client: import('discord.js').Client): void {
  botClient = client;
}

export {
  startTask,
  stopTask,
  isTaskRunning,
  calculateNextRun,
  taskRepository,
  TASK_TYPES,
};
