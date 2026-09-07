import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { PollRepository } from '../../database/repositories/PollRepository';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const pollRepo = new PollRepository();

router.get(
  '/:id/polls',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    try {
      const polls = await pollRepo.getPollsByGuild(guildId, status, 1000);
      const total = polls.length;
      const start = (pagination.page - 1) * pagination.pageSize;
      const paginated = polls.slice(start, start + pagination.pageSize);

      sendList(res, paginated, total, pagination);
    } catch (error) {
      logError(`Failed to fetch polls for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch polls', 'POLLS_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/polls/:pollId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pollId = parseInt(req.params.pollId as string, 10);

    if (isNaN(pollId)) {
      sendError(res, 400, 'Invalid poll ID', 'INVALID_POLL_ID');
      return;
    }

    try {
      const poll = await pollRepo.getPoll(pollId);

      if (!poll || poll.guild_id !== guildId) {
        sendError(res, 404, 'Poll not found', 'POLL_NOT_FOUND');
        return;
      }

      const [options, votes] = await Promise.all([
        pollRepo.getOptions(pollId),
        pollRepo.getVotes(pollId),
      ]);

      const results = options.map((opt) => ({
        option_id: opt.id,
        text: opt.option_text,
        vote_count: votes.filter((v) => v.option_id === opt.id).length,
      }));

      sendData(res, { ...poll, options, results });
    } catch (error) {
      logError(`Failed to fetch poll ${pollId} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch poll', 'POLL_FETCH_FAILED');
    }
  }
);

export default router;
