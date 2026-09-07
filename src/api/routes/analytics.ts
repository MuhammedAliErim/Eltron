import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { sendError, sendData } from '../utils/response';
import {
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getAnalyticsRange,
} from '../../services/analytics/AnalyticsService';
import { logError } from '../../utils/logger';

const router = Router();

function validateDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function validateDateRange(from: string, to: string): { valid: boolean; error?: string } {
  if (!validateDateFormat(from)) {
    return { valid: false, error: 'Invalid from date format. Use YYYY-MM-DD' };
  }
  if (!validateDateFormat(to)) {
    return { valid: false, error: 'Invalid to date format. Use YYYY-MM-DD' };
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return { valid: false, error: 'Invalid date values' };
  }
  if (fromDate > toDate) {
    return { valid: false, error: 'from date must be before to date' };
  }
  const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 365) {
    return { valid: false, error: 'Date range cannot exceed 365 days' };
  }
  return { valid: true };
}

router.get('/:id/analytics/overview', requireAuth, guildGuard, rateLimits.analytics, async (req: Request, res: Response) => {
  const guildId = req.params.id as string;

  try {
    const [weekly, yesterday] = await Promise.all([
      getWeeklyAnalytics(guildId),
      getDailyAnalytics(guildId, new Date(Date.now() - 86400000).toISOString().split('T')[0]),
    ]);

    sendData(res, { weekly, yesterday });
  } catch (error) {
    logError(`Failed to fetch analytics overview for guild ${guildId}`, error);
    sendError(res, 500, 'Failed to fetch analytics', 'ANALYTICS_FETCH_FAILED');
  }
});

router.get('/:id/analytics/daily', requireAuth, guildGuard, rateLimits.analytics, async (req: Request, res: Response) => {
  const guildId = req.params.id as string;
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  if (!validateDateFormat(date)) {
    sendError(res, 400, 'Invalid date format. Use YYYY-MM-DD', 'INVALID_DATE');
    return;
  }

  try {
    const analytics = await getDailyAnalytics(guildId, date);
    sendData(res, analytics);
  } catch (error) {
    logError(`Failed to fetch daily analytics for guild ${guildId}`, error);
    sendError(res, 500, 'Failed to fetch analytics', 'ANALYTICS_FETCH_FAILED');
  }
});

router.get('/:id/analytics/weekly', requireAuth, guildGuard, rateLimits.analytics, async (req: Request, res: Response) => {
  const guildId = req.params.id as string;

  try {
    const analytics = await getWeeklyAnalytics(guildId);
    sendData(res, analytics);
  } catch (error) {
    logError(`Failed to fetch weekly analytics for guild ${guildId}`, error);
    sendError(res, 500, 'Failed to fetch analytics', 'ANALYTICS_FETCH_FAILED');
  }
});

router.get('/:id/analytics/monthly', requireAuth, guildGuard, rateLimits.analytics, async (req: Request, res: Response) => {
  const guildId = req.params.id as string;

  try {
    const analytics = await getMonthlyAnalytics(guildId);
    sendData(res, analytics);
  } catch (error) {
    logError(`Failed to fetch monthly analytics for guild ${guildId}`, error);
    sendError(res, 500, 'Failed to fetch analytics', 'ANALYTICS_FETCH_FAILED');
  }
});

router.get('/:id/analytics/range', requireAuth, guildGuard, rateLimits.analytics, async (req: Request, res: Response) => {
  const guildId = req.params.id as string;
  const from = req.query.from as string;
  const to = req.query.to as string;

  if (!from || !to) {
    sendError(res, 400, 'from and to query parameters required', 'MISSING_PARAMS');
    return;
  }

  const validation = validateDateRange(from, to);
  if (!validation.valid) {
    sendError(res, 400, validation.error!, 'INVALID_DATE_RANGE');
    return;
  }

  try {
    const analytics = await getAnalyticsRange(guildId, from, to);
    sendData(res, analytics);
  } catch (error) {
    logError(`Failed to fetch analytics range for guild ${guildId}`, error);
    sendError(res, 500, 'Failed to fetch analytics', 'ANALYTICS_FETCH_FAILED');
  }
});

export default router;
