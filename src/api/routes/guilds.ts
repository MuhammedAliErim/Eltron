import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { sendError } from '../utils/response';
import { GuildRepository } from '../../database/repositories/GuildRepository';
import { logError } from '../../utils/logger';

const router = Router();
const guildRepository = new GuildRepository();

router.get('/', requireAuth, rateLimits.normalGet, async (req: Request, res: Response) => {
  try {
    const { getUserGuilds } = await import('../utils/discord');
    const userGuilds = await getUserGuilds(req.session.accessToken!);
    let botGuildIdSet: Set<string> | null = null;

    try {
      const { GuildRepository } = await import('../../database/repositories/GuildRepository');
      const guildRepository = new GuildRepository();
      const botGuilds = await guildRepository.getAllGuildIds();
      botGuildIdSet = new Set(botGuilds);
    } catch {
      // guilds table may not exist yet — show all manageable guilds
    }

    const accessibleGuilds = userGuilds
      .filter((g) => {
        const permissionBigInt = BigInt(g.permissions);
        const manageGuildBit = BigInt('0x0000000000000020');
        const hasManageGuild = (permissionBigInt & manageGuildBit) !== 0n;
        if (!hasManageGuild) return false;
        if (botGuildIdSet && botGuildIdSet.size > 0) {
          return botGuildIdSet.has(g.id);
        }
        return true;
      })
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        owner: g.owner,
        hasBot: botGuildIdSet ? botGuildIdSet.has(g.id) : false,
      }));

    res.json({ data: accessibleGuilds });
  } catch (error) {
    logError('Failed to fetch guilds', error);
    sendError(res, 500, 'Failed to fetch guilds', 'GUILDS_FETCH_FAILED');
  }
});

router.get('/:id', requireAuth, guildGuard, rateLimits.normalGet, async (req: Request, res: Response) => {
  const guildId = req.params.id as string;

  try {
    const guildSettings = await guildRepository.get(guildId);

    res.json({
      data: {
        id: req.guildMember!.guild.id,
        name: req.guildMember!.guild.name,
        icon: req.guildMember!.guild.icon,
        owner: req.guildMember!.guild.owner,
        settings: guildSettings || null,
      },
    });
  } catch (error) {
    logError(`Failed to fetch guild ${guildId}`, error);
    sendError(res, 500, 'Failed to fetch guild', 'GUILD_FETCH_FAILED');
  }
});

export default router;
