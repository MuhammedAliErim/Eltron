import { Request, Response, NextFunction } from 'express';
import { isAuthenticated, isTokenValid } from '../utils/session';
import { refreshAccessToken } from '../utils/discord';
import { sendError } from '../utils/response';
import { logError } from '../../utils/logger';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthenticated(req)) {
    sendError(res, 401, 'Unauthorized', 'NOT_AUTHENTICATED');
    return;
  }

  if (!isTokenValid(req.session.tokenExpiry!)) {
    refreshAccessToken(req.session.refreshToken!)
      .then((tokenData) => {
        req.session.accessToken = tokenData.access_token;
        req.session.refreshToken = tokenData.refresh_token;
        req.session.tokenExpiry = Date.now() + tokenData.expires_in * 1000;
        next();
      })
      .catch((error) => {
        logError('Token refresh failed', error);
        req.session.destroy((destroyErr) => {
          if (destroyErr) logError('Session destroy failed after refresh error', destroyErr);
        });
        sendError(res, 401, 'Token refresh failed', 'TOKEN_REFRESH_FAILED');
      });
    return;
  }

  next();
}
