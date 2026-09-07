import { Request, Response, NextFunction } from 'express';
import { getUserGuilds, refreshAccessToken, DiscordGuild } from '../utils/discord';
import { isAuthenticated, isTokenValid } from '../utils/session';
import { sendError } from '../utils/response';
import { logError } from '../../utils/logger';

export interface GuildMemberInfo {
  guild: DiscordGuild;
  hasManageGuild: boolean;
}

declare global {
  namespace Express {
    interface Request {
      guildMember?: GuildMemberInfo;
    }
  }
}

const MANAGE_GUILD_PERMISSION = '0x0000000000000020';

async function ensureValidToken(req: Request, res: Response): Promise<boolean> {
  if (!isAuthenticated(req)) {
    sendError(res, 401, 'Unauthorized', 'NOT_AUTHENTICATED');
    return false;
  }

  if (!isTokenValid(req.session.tokenExpiry!)) {
    try {
      const tokenData = await refreshAccessToken(req.session.refreshToken!);
      req.session.accessToken = tokenData.access_token;
      req.session.refreshToken = tokenData.refresh_token;
      req.session.tokenExpiry = Date.now() + tokenData.expires_in * 1000;
    } catch (error) {
      logError('Token refresh failed in guildGuard', error);
      req.session.destroy(() => {});
      sendError(res, 401, 'Token refresh failed', 'TOKEN_REFRESH_FAILED');
      return false;
    }
  }

  return true;
}

export async function guildGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const guildId = req.params.guildId || req.params.id;

  if (!guildId) {
    sendError(res, 400, 'Guild ID required', 'GUILD_ID_REQUIRED');
    return;
  }

  if (!(await ensureValidToken(req, res))) {
    return;
  }

  try {
    const userGuilds = await getUserGuilds(req.session.accessToken!);
    const targetGuild = userGuilds.find((g) => g.id === guildId);

    if (!targetGuild) {
      sendError(res, 404, 'Guild not found or bot not present', 'GUILD_NOT_FOUND');
      return;
    }

    const permissionBigInt = BigInt(targetGuild.permissions);
    const manageGuildBit = BigInt(MANAGE_GUILD_PERMISSION);
    const hasManageGuild = (permissionBigInt & manageGuildBit) !== 0n;

    if (!hasManageGuild) {
      sendError(res, 403, 'Insufficient permissions', 'MISSING_MANAGE_GUILD');
      return;
    }

    req.guildMember = {
      guild: targetGuild,
      hasManageGuild,
    };

    next();
  } catch (error) {
    logError('Guild guard check failed', error);
    sendError(res, 500, 'Failed to verify guild access', 'GUILD_CHECK_FAILED');
  }
}
