import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { ModerationCaseRepository } from '../../database/repositories/ModerationCaseRepository';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const moderationRepo = new ModerationCaseRepository();

router.get(
  '/:id/moderation/logs',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;

    try {
      const result = await moderationRepo.getCases(guildId, {
        page: pagination.page,
        pageSize: pagination.pageSize,
        type,
        userId,
      });

      sendList(res, result.data, result.total, pagination);
    } catch (error) {
      logError(`Failed to fetch moderation logs for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch moderation logs', 'MODLOG_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/moderation/logs/:caseId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const caseId = parseInt(req.params.caseId as string, 10);

    if (isNaN(caseId)) {
      sendError(res, 400, 'Invalid case ID', 'INVALID_CASE_ID');
      return;
    }

    try {
      const modCase = await moderationRepo.getCase(guildId, caseId);

      if (!modCase) {
        sendError(res, 404, 'Case not found', 'CASE_NOT_FOUND');
        return;
      }

      sendData(res, modCase);
    } catch (error) {
      logError(`Failed to fetch case ${caseId} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch case', 'CASE_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/moderation/warnings/:userId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const userId = req.params.userId as string;

    try {
      const warnings = await moderationRepo.getActiveWarnings(guildId, userId);
      sendData(res, warnings);
    } catch (error) {
      logError(`Failed to fetch warnings for user ${userId} in guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch warnings', 'WARNINGS_FETCH_FAILED');
    }
  }
);

export default router;
