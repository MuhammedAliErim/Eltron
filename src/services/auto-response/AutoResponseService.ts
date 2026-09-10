import { Message } from 'discord.js';
import { AutoResponseRepository, AutoResponseRow } from '../../database/repositories/AutoResponseRepository';
import { Cache } from '../../utils/cache';
import { logger } from '../../utils/logger';

const repo = new AutoResponseRepository();
const cache = new Cache<AutoResponseRow[]>(60000);

export interface MatchedAutoResponse {
  response: AutoResponseRow;
}

function matchesTrigger(messageContent: string, rule: AutoResponseRow): boolean {
  const content = messageContent;
  const trigger = rule.trigger_text;

  switch (rule.match_type) {
    case 'contains':
      return content.toLowerCase().includes(trigger.toLowerCase());
    case 'exact':
      return content.toLowerCase() === trigger.toLowerCase();
    case 'starts_with':
      return content.toLowerCase().startsWith(trigger.toLowerCase());
    case 'ends_with':
      return content.toLowerCase().endsWith(trigger.toLowerCase());
    case 'regex':
      try {
        const regex = new RegExp(trigger, 'i');
        return regex.test(content);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

async function getEnabledResponses(guildId: string): Promise<AutoResponseRow[]> {
  const cached = cache.get(guildId);
  if (cached) return cached;

  try {
    const responses = await repo.getEnabledByGuild(guildId);
    cache.set(guildId, responses);
    return responses;
  } catch (error) {
    logger.error({ err: error, guildId }, 'Failed to fetch enabled auto responses');
    return [];
  }
}

export function invalidateGuildCache(guildId: string): void {
  cache.delete(guildId);
}

export async function checkMessage(message: Message): Promise<MatchedAutoResponse[]> {
  if (!message.guild) return [];
  if (message.author.bot) return [];

  const guildId = message.guild.id;
  const channelId = message.channel.id;
  const content = message.content;

  const responses = await getEnabledResponses(guildId);
  const matched: MatchedAutoResponse[] = [];

  for (const rule of responses) {
    if (!matchesTrigger(content, rule)) continue;

    if (rule.channel_ids.length > 0 && !rule.channel_ids.includes(channelId)) {
      continue;
    }

    if (rule.excluded_channel_ids.includes(channelId)) {
      continue;
    }

    if (rule.cooldown_seconds > 0 && rule.last_used_at) {
      const lastUsed = new Date(rule.last_used_at).getTime();
      const cooldownMs = rule.cooldown_seconds * 1000;
      if (Date.now() - lastUsed < cooldownMs) {
        continue;
      }
    }

    matched.push({ response: rule });
    break;
  }

  return matched;
}
