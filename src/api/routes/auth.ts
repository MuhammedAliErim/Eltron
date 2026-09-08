import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { exchangeCode, getDiscordUser, refreshAccessToken } from '../utils/discord';
import { isAuthenticated, isTokenValid } from '../utils/session';
import { rateLimits } from '../middleware/rateLimit';
import { env } from '../../config/env';
import { logError } from '../../utils/logger';

const router = Router();

const REDIRECT_URI = `${env.DASHBOARD_URL}/api/auth/callback`;

router.get('/login', rateLimits.auth, (_req: Request, res: Response) => {
  const state = crypto.randomBytes(32).toString('hex');
  (_req as any).session.oauthState = state;

  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds',
    state,
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

router.get('/callback', rateLimits.auth, async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code) {
    res.redirect(`${env.DASHBOARD_URL}?error=no_code`);
    return;
  }

  const expectedState = (req as any).session?.oauthState;
  if (expectedState && state !== expectedState) {
    res.redirect(`${env.DASHBOARD_URL}?error=invalid_state`);
    return;
  }
  delete (req as any).session?.oauthState;

  try {
    const tokenData = await exchangeCode(code, REDIRECT_URI);
    const user = await getDiscordUser(tokenData.access_token);

    req.session.user = user;
    req.session.accessToken = tokenData.access_token;
    req.session.refreshToken = tokenData.refresh_token;
    req.session.tokenExpiry = Date.now() + tokenData.expires_in * 1000;

    res.redirect(`${env.DASHBOARD_URL}/dashboard`);
  } catch (error) {
    logError('OAuth callback failed', error);
    res.redirect(`${env.DASHBOARD_URL}?error=auth_failed`);
  }
});

router.get('/me', rateLimits.auth, async (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    return;
  }

  if (!isTokenValid(req.session.tokenExpiry!)) {
    try {
      const tokenData = await refreshAccessToken(req.session.refreshToken!);
      req.session.accessToken = tokenData.access_token;
      req.session.refreshToken = tokenData.refresh_token;
      req.session.tokenExpiry = Date.now() + tokenData.expires_in * 1000;
    } catch (error) {
      logError('Token refresh failed in /me', error);
      req.session.destroy(() => {});
      res.status(401).json({ error: 'Token refresh failed', code: 'TOKEN_REFRESH_FAILED' });
      return;
    }
  }

  res.json({
    data: {
      user: {
        id: req.session.user!.id,
        username: req.session.user!.username,
        discriminator: req.session.user!.discriminator,
        global_name: req.session.user!.global_name,
        avatar: req.session.user!.avatar,
      },
    },
  });
});

router.post('/logout', rateLimits.auth, (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      logError('Session destroy failed', err);
    }
    res.clearCookie('eltron.sid');
    res.json({ data: { success: true } });
  });
});

export default router;
