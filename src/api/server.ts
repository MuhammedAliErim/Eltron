import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { errorHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import guildRoutes from './routes/guilds';
import analyticsRoutes from './routes/analytics';
import moderationRoutes from './routes/moderation';
import automodRoutes from './routes/automod';
import securityRoutes from './routes/security';
import ticketRoutes from './routes/tickets';
import applicationRoutes from './routes/applications';
import staffRoutes from './routes/staff';
import welcomeRoutes from './routes/welcome';
import roleRoutes from './routes/roles';
import levelingRoutes from './routes/leveling';
import levelConfigRoutes from './routes/levelConfig';
import giveawayRoutes from './routes/giveaways';
import eventRoutes from './routes/events';
import pollRoutes from './routes/polls';
import reminderRoutes from './routes/reminders';
import taskRoutes from './routes/tasks';
import settingsRoutes from './routes/settings';
import reactionRolesRoutes from './routes/reactionRoles';
import autoResponsesRoutes from './routes/autoResponses';
import auditLogsRoutes from './routes/auditLogs';
import tagRoutes from './routes/tags';

const app = express();

app.set('trust proxy', 1);

const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

for (const origin of corsOrigins) {
  if (origin === '*') {
    logger.warn('[Server] CORS wildcard origin detected with credentials enabled - this is a security risk');
  }
}

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));

const useSecureCookies = env.NODE_ENV === 'production' && env.DASHBOARD_URL.startsWith('https://');

logger.info({
  nodeEnv: env.NODE_ENV,
  dashboardUrl: env.DASHBOARD_URL,
  useSecureCookies,
  cookieSecure: useSecureCookies,
  cookieSameSite: useSecureCookies ? 'none' : 'lax',
  corsOrigin: env.CORS_ORIGIN,
}, '[Server] cookie/CORS config');

app.use(session({
  secret: env.SESSION_SECRET as string,
  name: 'eltron.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: useSecureCookies,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: useSecureCookies ? 'none' : 'lax',
  },
}));

if (env.NODE_ENV === 'production') {
  if (!env.DISCORD_CLIENT_SECRET) {
    throw new Error('DISCORD_CLIENT_SECRET is required in production');
  }
}

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/guilds', analyticsRoutes);
app.use('/api/guilds', moderationRoutes);
app.use('/api/guilds', automodRoutes);
app.use('/api/guilds', securityRoutes);
app.use('/api/guilds', ticketRoutes);
app.use('/api/guilds', applicationRoutes);
app.use('/api/guilds', staffRoutes);
app.use('/api/guilds', welcomeRoutes);
app.use('/api/guilds', roleRoutes);
app.use('/api/guilds', levelingRoutes);
app.use('/api/guilds', levelConfigRoutes);
app.use('/api/guilds', giveawayRoutes);
app.use('/api/guilds', eventRoutes);
app.use('/api/guilds', pollRoutes);
app.use('/api/guilds', reminderRoutes);
app.use('/api/guilds', taskRoutes);
app.use('/api/guilds', settingsRoutes);
app.use('/api/guilds', reactionRolesRoutes);
app.use('/api/guilds', autoResponsesRoutes);
app.use('/api/guilds', tagRoutes);
app.use('/api/guilds/:id/audit-logs', auditLogsRoutes);

const dashboardDistPath = fs.existsSync(path.join(__dirname, 'dashboard'))
  ? path.join(__dirname, 'dashboard')
  : path.join(__dirname, '..', 'dashboard', 'dist');

if (fs.existsSync(dashboardDistPath)) {
  app.use(express.static(dashboardDistPath));
  const spaIndex = path.join(dashboardDistPath, 'index.html');
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(spaIndex, (err) => {
      if (err) next();
    });
  });
}

app.use(errorHandler);

import { Server } from 'http';

let server: Server | null = null;

export function startApiServer(): Server {
  const port = env.API_PORT;

  server = app.listen(port, () => {
    logger.info(`Dashboard API server running on port ${port}`);
  });

  server.on('error', (err) => {
    logger.error({ err }, 'API server error');
  });

  return server;
}

export function getApiServer(): Server | null {
  return server;
}

export default app;
