import { Request, Response, NextFunction } from 'express';
import { getUserGuilds, refreshAccessToken, DiscordGuild } from '../utils/discord';
import { isAuthenticated, isTokenValid } from '../utils/session';
import { sendError } from '../utils/response';
import { logError, logger } from '../../utils/logger';

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
  const sessionState = {
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    hasAccessToken: !!req.session?.accessToken,
    hasRefreshToken: !!req.session?.refreshToken,
    hasTokenExpiry: !!req.session?.tokenExpiry,
    tokenExpiryFuture: req.session?.tokenExpiry ? req.session.tokenExpiry > Date.now() : false,
  };

  if (!isAuthenticated(req)) {
    logger.warn({ ...sessionState }, '[GuildGuard] ensureValidToken: not authenticated');
    sendError(res, 401, 'Unauthorized', 'NOT_AUTHENTICATED');
    return false;
  }

  if (!isTokenValid(req.session.tokenExpiry!)) {
    logger.info({ ...sessionState }, '[GuildGuard] ensureValidToken: token expired, refreshing');
    try {
      const tokenData = await refreshAccessToken(req.session.refreshToken!);
      req.session.accessToken = tokenData.access_token;
      req.session.refreshToken = tokenData.refresh_token;
      req.session.tokenExpiry = Date.now() + tokenData.expires_in * 1000;
      logger.info('[GuildGuard] ensureValidToken: token refreshed successfully');
    } catch (error) {
      logError('[GuildGuard] ensureValidToken: token refresh failed', error);
      req.session.destroy(() => {});
      sendError(res, 401, 'Token refresh failed', 'TOKEN_REFRESH_FAILED');
      return false;
    }
  }

  return true;
}

export async function guildGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const guildId = req.params.guildId || req.params.id;
  logger.info({ guildId, hasSession: !!req.session, hasUser: !!req.session?.user, hasAccessToken: !!req.session?.accessToken }, '[GuildGuard] called');

  if (!guildId) {
    sendError(res, 400, 'Guild ID required', 'GUILD_ID_REQUIRED');
    return;
  }

  if (!(await ensureValidToken(req, res))) {
    return;
  }

  try {
    const accessToken = req.session.accessToken!;
    if (!accessToken) {
      logger.error({ guildId, hasAccessToken: false }, '[GuildGuard] accessToken is null/undefined before getUserGuilds call');
      sendError(res, 401, 'No access token in session', 'NO_ACCESS_TOKEN');
      return;
    }
    const userGuilds = await getUserGuilds(accessToken);
    const targetGuild = userGuilds.find((g) => g.id === guildId);

    if (!targetGuild) {
      sendError(res, 404, 'Guild not found or bot not present', 'GUILD_NOT_FOUND');
      return;
    }

    let permissionBigInt: bigint;
    try {
      permissionBigInt = BigInt(targetGuild.permissions);
    } catch (parseError) {
      logError(`[GuildGuard] BigInt parse failed: permissions="${targetGuild.permissions}" guildId=${guildId} userId=${req.session.user?.id}`, parseError);
      sendError(res, 500, 'Failed to parse guild permissions', 'PERMISSION_PARSE_FAILED');
      return;
    }

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
    const msg = error instanceof Error ? error.message : String(error);
    logError(`[GuildGuard] guild=${guildId} userId=${req.session.user?.id} error=${msg}`, error);
    sendError(res, 500, 'Failed to verify guild access', 'GUILD_CHECK_FAILED');
  }
}
