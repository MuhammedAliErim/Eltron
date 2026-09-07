import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { parsePagination, sendList, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();

router.get(
  '/:id/reminders',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      let countQuery = supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guildId);

      let dataQuery = supabase
        .from('reminders')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .range((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize - 1);

      if (status) {
        countQuery = countQuery.eq('status', status);
        dataQuery = dataQuery.eq('status', status);
      }

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      sendList(res, dataResult.data || [], countResult.count ?? 0, pagination);
    } catch (error) {
      logError(`Failed to fetch reminders for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch reminders', 'REMINDERS_FETCH_FAILED');
    }
  }
);

export default router;
