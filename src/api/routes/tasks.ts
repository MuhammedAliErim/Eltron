import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';
import { ScheduledTaskRepository } from '../../database/repositories/ScheduledTaskRepository';
import {
  startTask,
  stopTask,
  calculateNextRun,
} from '../../services/task/ScheduledTaskService';

const router = Router();
const taskRepository = new ScheduledTaskRepository();

router.get(
  '/:id/tasks',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);

    try {
      const tasks = await taskRepository.getByGuild(guildId);
      const total = tasks.length;
      const start = (pagination.page - 1) * pagination.pageSize;
      const paginated = tasks.slice(start, start + pagination.pageSize);

      sendList(res, paginated, total, pagination);
    } catch (error) {
      logError(`Failed to fetch tasks for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch tasks', 'TASKS_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/tasks/:taskId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const taskId = req.params.taskId as string;

    try {
      const task = await taskRepository.getById(taskId);
      if (!task) {
        sendError(res, 404, 'Task not found', 'TASK_NOT_FOUND');
        return;
      }

      sendData(res, task);
    } catch (error) {
      logError(`Failed to fetch task ${taskId}`, error);
      sendError(res, 500, 'Failed to fetch task', 'TASK_FETCH_FAILED');
    }
  }
);

router.post(
  '/:id/tasks',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const { name, type, interval_ms, channel_id, config } = req.body;

    if (!name || typeof name !== 'string') {
      sendError(res, 400, 'Name is required', 'NAME_REQUIRED');
      return;
    }

    if (!type || typeof type !== 'string') {
      sendError(res, 400, 'Type is required', 'TYPE_REQUIRED');
      return;
    }

    const validTypes = ['backup', 'reminder', 'announce', 'cleanup'];
    if (!validTypes.includes(type)) {
      sendError(res, 400, 'Invalid task type', 'INVALID_TYPE');
      return;
    }

    if (!interval_ms || typeof interval_ms !== 'number' || interval_ms < 300000) {
      sendError(res, 400, 'Interval must be at least 5 minutes (300000ms)', 'INVALID_INTERVAL');
      return;
    }

    try {
      const taskConfig: Record<string, unknown> = config || {};
      if (channel_id) {
        taskConfig.channel_id = channel_id;
      }

      const nextRun = calculateNextRun(interval_ms);

      const task = await taskRepository.create({
        guild_id: guildId,
        name,
        type,
        interval_ms,
        config: taskConfig,
        created_by: req.session.user?.id || 'api',
      });

      startTask({ ...task, enabled: true, interval_ms });

      res.status(201).json({ data: task });
    } catch (error) {
      logError(`Failed to create task for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to create task', 'TASK_CREATE_FAILED');
    }
  }
);

router.put(
  '/:id/tasks/:taskId',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const taskId = req.params.taskId as string;
    const { enabled, interval_ms, config } = req.body;

    try {
      const existing = await taskRepository.getById(taskId);
      if (!existing) {
        sendError(res, 404, 'Task not found', 'TASK_NOT_FOUND');
        return;
      }

      const updates: Record<string, unknown> = {};
      if (typeof enabled === 'boolean') updates.enabled = enabled;
      if (typeof interval_ms === 'number' && interval_ms >= 300000) {
        updates.interval_ms = interval_ms;
        updates.next_run = calculateNextRun(interval_ms).toISOString();
      }
      if (config && typeof config === 'object') updates.config = config;

      const task = await taskRepository.update(taskId, updates);

      if (typeof enabled === 'boolean') {
        if (enabled) {
          startTask({ ...existing, ...updates, enabled: true } as any);
        } else {
          stopTask(taskId);
        }
      } else if (typeof interval_ms === 'number') {
        stopTask(taskId);
        startTask({ ...existing, ...updates, enabled: existing.enabled } as any);
      }

      sendData(res, task);
    } catch (error) {
      logError(`Failed to update task ${taskId}`, error);
      sendError(res, 500, 'Failed to update task', 'TASK_UPDATE_FAILED');
    }
  }
);

router.delete(
  '/:id/tasks/:taskId',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const taskId = req.params.taskId as string;

    try {
      const existing = await taskRepository.getById(taskId);
      if (!existing) {
        sendError(res, 404, 'Task not found', 'TASK_NOT_FOUND');
        return;
      }

      stopTask(taskId);
      await taskRepository.delete(taskId);

      res.status(204).send();
    } catch (error) {
      logError(`Failed to delete task ${taskId}`, error);
      sendError(res, 500, 'Failed to delete task', 'TASK_DELETE_FAILED');
    }
  }
);

export default router;
