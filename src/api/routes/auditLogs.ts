import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { AuditLogRepository } from '../../database/repositories/AuditLogRepository';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router({ mergeParams: true });
const auditLogRepo = new AuditLogRepository();

router.get(
  '/',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const moderatorId = typeof req.query.moderatorId === 'string' ? req.query.moderatorId : undefined;
    const targetId = typeof req.query.targetId === 'string' ? req.query.targetId : undefined;

    try {
      const result = await auditLogRepo.getLogs(guildId, {
        action,
        moderatorId,
        targetId,
        page: pagination.page,
        limit: pagination.pageSize,
      });

      sendList(res, result.data, result.total, pagination);
    } catch (error) {
      logError(`Failed to fetch audit logs for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch audit logs', 'AUDIT_LOG_FETCH_FAILED');
    }
  }
);

router.get(
  '/stats',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const days = parseInt(String(req.query.days || '30'), 10) || 30;

    try {
      const stats = await auditLogRepo.getModerationStats(guildId, days);
      sendData(res, stats);
    } catch (error) {
      logError(`Failed to fetch audit log stats for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch audit log stats', 'AUDIT_LOG_STATS_FAILED');
    }
  }
);

router.get(
  '/:logId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const logId = req.params.logId as string;

    try {
      const logEntry = await auditLogRepo.getLogById(logId);

      if (!logEntry) {
        sendError(res, 404, 'Audit log not found', 'AUDIT_LOG_NOT_FOUND');
        return;
      }

      sendData(res, logEntry);
    } catch (error) {
      logError(`Failed to fetch audit log ${logId}`, error);
      sendError(res, 500, 'Failed to fetch audit log', 'AUDIT_LOG_FETCH_FAILED');
    }
  }
);

export default router;
