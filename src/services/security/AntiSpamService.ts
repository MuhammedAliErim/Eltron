import { Cache } from '../../utils/cache';
import { GuildAutomodConfigRow, AutomodViolation } from '../../database/schema';
import {
  detectBannedWord,
  detectDiscordInvite,
  detectUrl,
  detectIpAddress,
  detectMentionSpam,
  detectCapsSpam,
  detectFlood,
  detectDuplicateMessage,
  detectEmojiSpam,
  DetectionResult,
} from './DetectionEngine';
import { isBypassed } from './AutomodConfig';
import type { Message } from 'discord.js';

interface MessageRecord {
  content: string;
  normalized: string;
  timestamp: number;
}

interface UserSpamState {
  timestamps: number[];
  messages: MessageRecord[];
  violationCount: number;
  lastViolation: number;
  lastAction: number;
}

const spamStateCache = new Cache<UserSpamState>(60000);

const getStateKey = (guildId: string, userId: string): string => `spam:${guildId}:${userId}`;

const getState = (guildId: string, userId: string): UserSpamState => {
  const key = getStateKey(guildId, userId);
  const existing = spamStateCache.get(key);
  if (existing) return existing;

  const state: UserSpamState = {
    timestamps: [],
    messages: [],
    violationCount: 0,
    lastViolation: 0,
    lastAction: 0,
  };
  spamStateCache.set(key, state);
  return state;
};

const normalize = (text: string): string =>
  text.toLowerCase().trim().replace(/\s+/g, ' ');

const isBotOrSystem = (message: Message): boolean => {
  if (message.author.bot) return true;
  if (message.webhookId) return true;
  if (message.system) return true;
  return false;
};

const isDM = (message: Message): boolean => !message.guild;

const COOLDOWN_MS = 5000;

export interface SpamCheckResult {
  violations: AutomodViolation[];
  shouldDelete: boolean;
}

export const checkMessage = async (
  message: Message,
  config: GuildAutomodConfigRow
): Promise<SpamCheckResult> => {
  const result: SpamCheckResult = { violations: [], shouldDelete: false };

  if (isBotOrSystem(message)) return result;
  if (isDM(message)) return result;
  if (!config.enabled) return result;

  const member = message.member;
  if (!member) return result;

  const memberRoles = member.roles.cache.map((r) => r.id);

  if (isBypassed(config, message.author.id, message.channelId, memberRoles)) return result;

  const state = getState(message.guildId!, message.author.id);
  const now = Date.now();
  const content = message.content;

  state.timestamps.push(now);
  const windowMs = config.flood_window_seconds * 1000;
  state.timestamps = state.timestamps.filter((t) => now - t <= windowMs * 2);

  const normalizedContent = normalize(content);
  state.messages.push({ content, normalized: normalizedContent, timestamp: now });
  const dupWindowMs = config.duplicate_window_seconds * 1000;
  state.messages = state.messages.filter((m) => now - m.timestamp <= dupWindowMs);

  const checkAndAdd = (det: DetectionResult) => {
    if (det.violation) {
      result.violations.push(det.violation);
      if (det.violation.shouldDelete) result.shouldDelete = true;
    }
  };

  checkAndAdd(detectBannedWord(content, config));
  checkAndAdd(detectDiscordInvite(content, config));
  checkAndAdd(detectUrl(content, config));
  checkAndAdd(detectIpAddress(content));
  checkAndAdd(detectMentionSpam(content, config));
  checkAndAdd(detectCapsSpam(content, config));
  checkAndAdd(detectEmojiSpam(content, config));
  checkAndAdd(detectFlood(state.timestamps, config));

  const dupResult = detectDuplicateMessage(
    content,
    state.messages.map((m) => ({ normalized: m.normalized, timestamp: m.timestamp })),
    config
  );
  if (dupResult.violation) {
    result.violations.push(dupResult.violation);
    if (dupResult.violation.shouldDelete) result.shouldDelete = true;
  }

  if (result.violations.length > 0) {
    state.violationCount++;
    state.lastViolation = now;

    const dominantViolation = result.violations.find((v) => v.shouldPunish) || result.violations[0];
    const timeSinceLastAction = now - state.lastAction;

    if (timeSinceLastAction < COOLDOWN_MS) {
      result.violations = result.violations.filter((v) => !v.shouldPunish);
    } else if (dominantViolation.shouldPunish) {
      state.lastAction = now;
    }
  }

  return result;
};

export const resetUserState = (guildId: string, userId: string): void => {
  spamStateCache.delete(getStateKey(guildId, userId));
};

export const cleanupSpamCache = (): void => {
  const now = Date.now();
  for (const [key, state] of spamStateCache.entries()) {
    const lastTimestamp = state.timestamps[state.timestamps.length - 1] ?? 0;
    if (now - lastTimestamp > 60000) {
      spamStateCache.delete(key);
    }
  }
};
