import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { TicketRepository } from '../../database/repositories/TicketRepository';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const ticketRepo = new TicketRepository();

router.get(
  '/:id/tickets',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    try {
      const result = await ticketRepo.listGuildTicketsPaginated(guildId, {
        page: pagination.page,
        pageSize: pagination.pageSize,
        status,
      });

      sendList(res, result.data, result.total, pagination);
    } catch (error) {
      logError(`Failed to fetch tickets for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch tickets', 'TICKETS_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/tickets/:ticketId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const ticketId = parseInt(req.params.ticketId as string, 10);

    if (isNaN(ticketId)) {
      sendError(res, 400, 'Invalid ticket ID', 'INVALID_TICKET_ID');
      return;
    }

    try {
      const ticket = await ticketRepo.getTicket(ticketId);

      if (!ticket || ticket.guild_id !== guildId) {
        sendError(res, 404, 'Ticket not found', 'TICKET_NOT_FOUND');
        return;
      }

      sendData(res, ticket);
    } catch (error) {
      logError(`Failed to fetch ticket ${ticketId} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch ticket', 'TICKET_FETCH_FAILED');
    }
  }
);

export default router;
