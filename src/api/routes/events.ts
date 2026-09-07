import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { EventRepository } from '../../database/repositories/EventRepository';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const eventRepo = new EventRepository();

router.get(
  '/:id/events',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    try {
      const events = await eventRepo.getEventsByGuild(guildId, status, 1000);
      const total = events.length;
      const start = (pagination.page - 1) * pagination.pageSize;
      const paginated = events.slice(start, start + pagination.pageSize);

      sendList(res, paginated, total, pagination);
    } catch (error) {
      logError(`Failed to fetch events for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch events', 'EVENTS_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/events/:eventId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const eventId = parseInt(req.params.eventId as string, 10);

    if (isNaN(eventId)) {
      sendError(res, 400, 'Invalid event ID', 'INVALID_EVENT_ID');
      return;
    }

    try {
      const event = await eventRepo.getEvent(eventId);

      if (!event || event.guild_id !== guildId) {
        sendError(res, 404, 'Event not found', 'EVENT_NOT_FOUND');
        return;
      }

      const [participants, winners] = await Promise.all([
        eventRepo.getParticipants(eventId),
        eventRepo.getWinners(eventId),
      ]);

      sendData(res, { ...event, participants, winners });
    } catch (error) {
      logError(`Failed to fetch event ${eventId} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch event', 'EVENT_FETCH_FAILED');
    }
  }
);

export default router;
