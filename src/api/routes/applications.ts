import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { ApplicationRepository } from '../../database/repositories/ApplicationRepository';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const applicationRepo = new ApplicationRepository();

router.get(
  '/:id/applications',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;

    try {
      const result = await applicationRepo.listGuildApplicationsPaginated(guildId, {
        page: pagination.page,
        pageSize: pagination.pageSize,
        status,
        type,
      });

      sendList(res, result.data, result.total, pagination);
    } catch (error) {
      logError(`Failed to fetch applications for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch applications', 'APPLICATIONS_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/applications/:appId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const appId = parseInt(req.params.appId as string, 10);

    if (isNaN(appId)) {
      sendError(res, 400, 'Invalid application ID', 'INVALID_APPLICATION_ID');
      return;
    }

    try {
      const application = await applicationRepo.getApplication(appId);

      if (!application || application.guild_id !== guildId) {
        sendError(res, 404, 'Application not found', 'APPLICATION_NOT_FOUND');
        return;
      }

      const answers = await applicationRepo.getAnswers(appId);

      sendData(res, { ...application, answers });
    } catch (error) {
      logError(`Failed to fetch application ${appId} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch application', 'APPLICATION_FETCH_FAILED');
    }
  }
);

export default router;
