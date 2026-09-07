import express from 'express';
import cors from 'cors';
import session from 'express-session';
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
import giveawayRoutes from './routes/giveaways';
import eventRoutes from './routes/events';
import pollRoutes from './routes/polls';
import reminderRoutes from './routes/reminders';
import settingsRoutes from './routes/settings';

const app = express();

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));

app.use(session({
  secret: env.SESSION_SECRET || 'dev-session-secret-change-in-production',
  name: 'eltron.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: env.NODE_ENV === 'production' ? undefined : 'localhost',
  },
}));

if (env.NODE_ENV === 'production' && (!env.SESSION_SECRET || env.SESSION_SECRET === 'dev-session-secret-change-in-production')) {
  throw new Error('SESSION_SECRET must be set to a secure value in production');
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
app.use('/api/guilds', giveawayRoutes);
app.use('/api/guilds', eventRoutes);
app.use('/api/guilds', pollRoutes);
app.use('/api/guilds', reminderRoutes);
app.use('/api/guilds', settingsRoutes);

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
