import { Message, EmbedBuilder, Colors, TextChannel } from 'discord.js';
import { UserXPRow, LeaderboardEntry } from '../../database/schema';
import { LevelRepository } from '../../database/repositories/LevelRepository';
import { Cache } from '../../utils/cache';
import { logger } from '../../utils/logger';
import { processLevelUp } from './LevelUpService';

export const XP_BASE = 100;
export const MIN_MESSAGE_XP = 5;
export const MAX_MESSAGE_XP = 15;
export const MESSAGE_XP_COOLDOWN_MS = 60_000;

const xpCooldownCache = new Cache<boolean>(MESSAGE_XP_COOLDOWN_MS);

export const calculateLevel = (xp: number): number => {
  if (xp <= 0) return 0;
  return Math.floor(Math.sqrt(xp / XP_BASE));
};

export const xpRequiredForLevel = (level: number): number => {
  if (level <= 0) return 0;
  return XP_BASE * level * level;
};

export const xpProgress = (xp: number): {
  currentLevel: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
} => {
  const currentLevel = calculateLevel(xp);
  const currentLevelXP = xpRequiredForLevel(currentLevel);
  const nextLevelXP = xpRequiredForLevel(currentLevel + 1);
  const xpInLevel = xp - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progress = xpNeeded > 0 ? xpInLevel / xpNeeded : 0;

  return { currentLevel, currentLevelXP, nextLevelXP, progress };
};

export const xpToNextLevel = (xp: number): number => {
  const currentLevel = calculateLevel(xp);
  const nextLevelXP = xpRequiredForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXP - xp);
};

export const getRandomMessageXP = (): number => {
  return Math.floor(Math.random() * (MAX_MESSAGE_XP - MIN_MESSAGE_XP + 1)) + MIN_MESSAGE_XP;
};

export const canEarnXP = (guildId: string, userId: string): boolean => {
  const key = `${guildId}:${userId}`;
  if (xpCooldownCache.has(key)) return false;
  xpCooldownCache.set(key, true, MESSAGE_XP_COOLDOWN_MS);
  return true;
};

export const handleMessageXP = async (
  message: Message,
  repo: LevelRepository
): Promise<{ oldLevel: number; newLevel: number; xp: number; leveledUp: boolean } | null> => {
  if (!message.guild) return null;
  if (message.author.bot) return null;
  if (message.webhookId) return null;
  if (message.system) return null;

  const guildId = message.guild.id;
  const userId = message.author.id;

  if (!canEarnXP(guildId, userId)) return null;

  const xpAmount = getRandomMessageXP();

  try {
    const oldUser = await repo.getUserXP(guildId, userId);
    const oldLevel = oldUser ? calculateLevel(oldUser.xp) : 0;

    const updatedUser = await repo.addXP(guildId, userId, xpAmount);
    const newLevel = calculateLevel(updatedUser.xp);

    const leveledUp = newLevel > oldLevel;

    if (leveledUp) {
      logger.info({
        guildId,
        userId,
        oldLevel,
        newLevel,
        xp: updatedUser.xp,
      }, 'User leveled up');

      const member = message.member;
      if (member && message.channel.isTextBased()) {
        processLevelUp(message.guild, member, oldLevel, newLevel, message.channel as TextChannel).catch(() => {});
      }
    }

    return {
      oldLevel,
      newLevel,
      xp: updatedUser.xp,
      leveledUp,
    };
  } catch (error) {
    logger.error({ err: error, guildId, userId }, 'Failed to award message XP');
    return null;
  }
};

export const createProfileEmbed = (
  userXP: UserXPRow,
  rank: number | null
): EmbedBuilder => {
  const { currentLevel, currentLevelXP, nextLevelXP, progress } = xpProgress(userXP.xp);
  const xpInLevel = userXP.xp - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;

  const progressBar = xpNeeded > 0
    ? `${'█'.repeat(Math.floor(progress * 20))}${'░'.repeat(20 - Math.floor(progress * 20))}`
    : `${'█'.repeat(20)}`;

  const embed = new EmbedBuilder()
    .setTitle('Level Profile')
    .setColor(Colors.Blue)
    .addFields(
      { name: 'Level', value: String(currentLevel), inline: true },
      { name: 'XP', value: `${userXP.xp.toLocaleString()}`, inline: true },
      { name: 'Rank', value: rank ? `#${rank}` : 'N/A', inline: true },
      { name: 'Messages', value: userXP.total_messages.toLocaleString(), inline: true },
      { name: 'Progress', value: `${progressBar}\n${xpInLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`, inline: false },
    )
    .setTimestamp();

  return embed;
};

export const createLeaderboardEmbed = (
  entries: LeaderboardEntry[],
  guildName: string
): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle(`Leaderboard — ${guildName}`)
    .setColor(Colors.Gold);

  if (entries.length === 0) {
    embed.setDescription('No entries yet.');
    return embed;
  }

  const lines = entries.map((e) => {
    const medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`;
    return `${medal} <@${e.user_id}> — Level ${e.level} (${e.xp.toLocaleString()} XP)`;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
};
