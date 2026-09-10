import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { ReactionRoleRepository } from '../../database/repositories/ReactionRoleRepository';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const reactionRoleRepo = new ReactionRoleRepository();

router.get(
  '/:guildId/reaction-roles',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);

    try {
      const allRoles = await reactionRoleRepo.getByGuild(guildId);
      const total = allRoles.length;
      const start = (pagination.page - 1) * pagination.pageSize;
      const paginated = allRoles.slice(start, start + pagination.pageSize);

      sendList(res, paginated, total, pagination);
    } catch (error) {
      logError(`Failed to fetch reaction roles for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch reaction roles', 'REACTION_ROLES_FETCH_FAILED');
    }
  }
);

router.get(
  '/:guildId/reaction-roles/:id',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const id = req.params.id as string;

    try {
      const reactionRole = await reactionRoleRepo.getById(id);

      if (!reactionRole || reactionRole.guild_id !== guildId) {
        sendError(res, 404, 'Reaction role not found', 'REACTION_ROLE_NOT_FOUND');
        return;
      }

      sendData(res, reactionRole);
    } catch (error) {
      logError(`Failed to fetch reaction role ${id} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch reaction role', 'REACTION_ROLE_FETCH_FAILED');
    }
  }
);

router.delete(
  '/:guildId/reaction-roles/:id',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const id = req.params.id as string;

    try {
      const reactionRole = await reactionRoleRepo.getById(id);

      if (!reactionRole || reactionRole.guild_id !== guildId) {
        sendError(res, 404, 'Reaction role not found', 'REACTION_ROLE_NOT_FOUND');
        return;
      }

      await reactionRoleRepo.delete(id);

      sendData(res, { deleted: true });
    } catch (error) {
      logError(`Failed to delete reaction role ${id} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to delete reaction role', 'REACTION_ROLE_DELETE_FAILED');
    }
  }
);

export default router;
