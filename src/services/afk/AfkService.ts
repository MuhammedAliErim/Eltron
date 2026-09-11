import { Message } from 'discord.js';
import { AfkRepository } from '../../database/repositories/AfkRepository';

const repo = new AfkRepository();

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

export async function setAfk(
  guildId: string,
  userId: string,
  reason: string,
  channelId: string
): Promise<void> {
  await repo.setAfk(guildId, userId, reason, channelId);
}

export async function removeAfk(guildId: string, userId: string): Promise<void> {
  await repo.removeAfk(guildId, userId);
}

export async function checkMention(message: Message): Promise<{
  afk: true;
  user: string;
  reason: string;
  duration: string;
} | null> {
  if (!message.guild) return null;
  if (message.mentions.users.size === 0) return null;

  for (const [, user] of message.mentions.users) {
    if (user.id === message.author.id) continue;

    const afkData = await repo.getAfk(message.guild.id, user.id);
    if (afkData) {
      const duration = Date.now() - new Date(afkData.created_at).getTime();
      return {
        afk: true,
        user: user.tag,
        reason: afkData.reason,
        duration: formatDuration(duration),
      };
    }
  }

  return null;
}

export async function checkMessage(message: Message): Promise<{
  removed: true;
  duration: string;
} | null> {
  if (!message.guild) return null;

  const afkData = await repo.getAfk(message.guild.id, message.author.id);
  if (!afkData) return null;

  const duration = Date.now() - new Date(afkData.created_at).getTime();
  await repo.removeAfk(message.guild.id, message.author.id);

  return {
    removed: true,
    duration: formatDuration(duration),
  };
}
