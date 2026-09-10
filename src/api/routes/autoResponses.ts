import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { AutoResponseRepository } from '../../database/repositories/AutoResponseRepository';
import { invalidateGuildCache } from '../../services/auto-response/AutoResponseService';
import { sendData, sendError, sendList, parsePagination } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router({ mergeParams: true });
const repo = new AutoResponseRepository();

const createSchema = z.object({
  trigger_text: z.string().min(1).max(500),
  response_text: z.string().min(1).max(2000),
  match_type: z.enum(['contains', 'exact', 'starts_with', 'ends_with', 'regex']),
  channel_ids: z.array(z.string()).optional(),
  excluded_channel_ids: z.array(z.string()).optional(),
  cooldown_seconds: z.number().int().min(0).max(3600).optional(),
});

const updateSchema = z.object({
  trigger_text: z.string().min(1).max(500).optional(),
  response_text: z.string().min(1).max(2000).optional(),
  match_type: z.enum(['contains', 'exact', 'starts_with', 'ends_with', 'regex']).optional(),
  channel_ids: z.array(z.string()).optional(),
  excluded_channel_ids: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  cooldown_seconds: z.number().int().min(0).max(3600).optional(),
});

router.get(
  '/:id/auto-responses',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);

    try {
      const all = await repo.getByGuild(guildId);
      const start = (pagination.page - 1) * pagination.pageSize;
      const pageItems = all.slice(start, start + pagination.pageSize);
      sendList(res, pageItems, all.length, pagination);
    } catch (error) {
      logError(`Failed to fetch auto responses for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch auto responses', 'AUTO_RESPONSES_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/auto-responses/:responseId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const responseId = req.params.responseId as string;

    try {
      const response = await repo.getById(responseId);
      if (!response) {
        sendError(res, 404, 'Auto-response not found', 'AUTO_RESPONSE_NOT_FOUND');
        return;
      }
      sendData(res, response);
    } catch (error) {
      logError(`Failed to fetch auto response ${responseId}`, error);
      sendError(res, 500, 'Failed to fetch auto response', 'AUTO_RESPONSE_FETCH_FAILED');
    }
  }
);

router.post(
  '/:id/auto-responses',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(createSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const created = await repo.create({
        guild_id: guildId,
        ...req.body,
        created_by: (req.session as any)?.user?.id || 'unknown',
      });
      invalidateGuildCache(guildId);
      sendData(res, created);
    } catch (error) {
      logError(`Failed to create auto response for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to create auto response', 'AUTO_RESPONSE_CREATE_FAILED');
    }
  }
);

router.put(
  '/:id/auto-responses/:responseId',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(updateSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const responseId = req.params.responseId as string;

    try {
      const existing = await repo.getById(responseId);
      if (!existing || existing.guild_id !== guildId) {
        sendError(res, 404, 'Auto-response not found', 'AUTO_RESPONSE_NOT_FOUND');
        return;
      }

      const updated = await repo.update(responseId, req.body);
      invalidateGuildCache(guildId);
      sendData(res, updated);
    } catch (error) {
      logError(`Failed to update auto response ${responseId}`, error);
      sendError(res, 500, 'Failed to update auto response', 'AUTO_RESPONSE_UPDATE_FAILED');
    }
  }
);

router.delete(
  '/:id/auto-responses/:responseId',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const responseId = req.params.responseId as string;

    try {
      const existing = await repo.getById(responseId);
      if (!existing || existing.guild_id !== guildId) {
        sendError(res, 404, 'Auto-response not found', 'AUTO_RESPONSE_NOT_FOUND');
        return;
      }

      await repo.delete(responseId);
      invalidateGuildCache(guildId);
      sendData(res, { deleted: true });
    } catch (error) {
      logError(`Failed to delete auto response ${responseId}`, error);
      sendError(res, 500, 'Failed to delete auto response', 'AUTO_RESPONSE_DELETE_FAILED');
    }
  }
);

export default router;
