import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { MessageLogRepository } from '../../database/repositories/MessageLogRepository';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router({ mergeParams: true });
const messageLogRepo = new MessageLogRepository();

router.get(
  '/',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const authorId = typeof req.query.authorId === 'string' ? req.query.authorId : undefined;
    const channelId = typeof req.query.channelId === 'string' ? req.query.channelId : undefined;

    try {
      const result = await messageLogRepo.getByGuild(guildId, {
        action,
        authorId,
        channelId,
        page: pagination.page,
        limit: pagination.pageSize,
      });

      sendList(res, result.data, result.total, pagination);
    } catch (error) {
      logError(`Failed to fetch message logs for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch message logs', 'MESSAGE_LOG_FETCH_FAILED');
    }
  }
);

router.get(
  '/search',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const authorId = typeof req.query.authorId === 'string' ? req.query.authorId : undefined;

    if (!query) {
      sendError(res, 400, 'Search query required', 'QUERY_REQUIRED');
      return;
    }

    try {
      const result = await messageLogRepo.search(guildId, query, authorId, pagination.page, pagination.pageSize);
      sendList(res, result.data, result.total, pagination);
    } catch (error) {
      logError(`Failed to search message logs for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to search message logs', 'MESSAGE_LOG_SEARCH_FAILED');
    }
  }
);

export default router;
