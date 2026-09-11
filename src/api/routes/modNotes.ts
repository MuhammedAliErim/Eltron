import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { ModNoteRepository } from '../../database/repositories/ModNoteRepository';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const modNoteRepo = new ModNoteRepository();

router.get(
  '/:id/mod-notes/:userId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const userId = req.params.userId as string;

    try {
      const notes = await modNoteRepo.getByUser(guildId, userId);
      sendData(res, notes);
    } catch (error) {
      logError(`Failed to fetch mod notes for user ${userId} in guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch mod notes', 'MODNOTES_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/mod-notes',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);

    try {
      const result = await modNoteRepo.getAll(guildId, pagination.page, pagination.pageSize);
      sendList(res, result.data, result.total, pagination);
    } catch (error) {
      logError(`Failed to fetch mod notes for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch mod notes', 'MODNOTES_FETCH_FAILED');
    }
  }
);

router.post(
  '/:id/mod-notes',
  requireAuth,
  guildGuard,
  rateLimits.normalPost,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const { userId, moderatorId, note } = req.body;

    if (!userId || !moderatorId || !note) {
      sendError(res, 400, 'Missing required fields', 'MISSING_FIELDS');
      return;
    }

    if (typeof note !== 'string' || note.length > 500) {
      sendError(res, 400, 'Note must be a string with max 500 characters', 'INVALID_NOTE');
      return;
    }

    try {
      const created = await modNoteRepo.add({
        guild_id: guildId,
        user_id: userId,
        moderator_id: moderatorId,
        note,
      });

      sendData(res, created);
    } catch (error) {
      logError(`Failed to add mod note for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to add mod note', 'MODNOTES_ADD_FAILED');
    }
  }
);

router.delete(
  '/:id/mod-notes/:noteId',
  requireAuth,
  guildGuard,
  rateLimits.normalPost,
  async (req: Request, res: Response) => {
    const noteId = req.params.noteId as string;

    try {
      const deleted = await modNoteRepo.delete(noteId);

      if (!deleted) {
        sendError(res, 404, 'Note not found', 'NOTE_NOT_FOUND');
        return;
      }

      sendData(res, { success: true });
    } catch (error) {
      logError(`Failed to delete mod note ${noteId}`, error);
      sendError(res, 500, 'Failed to delete mod note', 'MODNOTES_DELETE_FAILED');
    }
  }
);

export default router;
