import {
  GuildAutomodConfigRow,
  AutomodViolation,
} from '../../database/schema';

const DISCORD_INVITE_REGEX = /(?:discord\.gg|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9_-]+/i;
const URL_REGEX = /https?:\/\/[^\s<]+/i;
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;

const normalizeForDuplicate = (text: string): string =>
  text.toLowerCase().trim().replace(/\s+/g, ' ');

const countMentions = (content: string): { users: number; roles: number; everyone: number } => {
  const userMentions = (content.match(/<@!?\d+>/g) || []).length;
  const roleMentions = (content.match(/<@&\d+>/g) || []).length;
  const everyone = (content.match(/@(?:everyone|here)/gi) || []).length;
  return { users: userMentions, roles: roleMentions, everyone };
};

const countEmoji = (content: string): number => {
  const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
  return (content.match(emojiRegex) || []).length;
};

const getCapsRatio = (text: string): number => {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
};

export interface DetectionResult {
  violation: AutomodViolation | null;
  normalizedContent?: string;
}

export const detectBannedWord = (
  content: string,
  config: GuildAutomodConfigRow
): DetectionResult => {
  const lower = content.toLowerCase();
  for (const word of config.banned_words) {
    if (lower.includes(word.toLowerCase())) {
      return {
        violation: {
          triggerType: 'BANNED_WORD',
          actionType: config.default_action,
          reason: `Message contains banned word: "${word}"`,
          shouldDelete: true,
          shouldPunish: config.default_action !== 'DELETE',
        },
      };
    }
  }
  return { violation: null };
};

export const detectDiscordInvite = (
  content: string,
  config: GuildAutomodConfigRow
): DetectionResult => {
  if (!config.blocked_invites) return { violation: null };
  if (DISCORD_INVITE_REGEX.test(content)) {
    return {
      violation: {
        triggerType: 'DISCORD_INVITE',
        actionType: config.default_action,
        reason: 'Message contains Discord invite link',
        shouldDelete: true,
        shouldPunish: config.default_action !== 'DELETE',
      },
    };
  }
  return { violation: null };
};

export const detectUrl = (
  content: string,
  config: GuildAutomodConfigRow
): DetectionResult => {
  if (config.blocked_domains.length === 0) return { violation: null };
  const lower = content.toLowerCase();
  for (const domain of config.blocked_domains) {
    if (lower.includes(domain.toLowerCase())) {
      return {
        violation: {
          triggerType: 'URL',
          actionType: config.default_action,
          reason: `Message contains blocked domain: "${domain}"`,
          shouldDelete: true,
          shouldPunish: config.default_action !== 'DELETE',
        },
      };
    }
  }
  return { violation: null };
};

export const detectIpAddress = (content: string): DetectionResult => {
  if (IP_REGEX.test(content)) {
    return {
      violation: {
        triggerType: 'IP_ADDRESS',
        actionType: 'DELETE',
        reason: 'Message contains IP address',
        shouldDelete: true,
        shouldPunish: false,
      },
    };
  }
  return { violation: null };
};

export const detectMentionSpam = (
  content: string,
  config: GuildAutomodConfigRow
): DetectionResult => {
  const mentions = countMentions(content);
  const total = mentions.users + mentions.roles + mentions.everyone;
  if (total > config.mention_limit) {
    return {
      violation: {
        triggerType: 'MENTION_SPAM',
        actionType: config.default_action,
        reason: `Excessive mentions: ${total} (limit: ${config.mention_limit})`,
        shouldDelete: true,
        shouldPunish: config.default_action !== 'DELETE',
      },
    };
  }
  return { violation: null };
};

export const detectCapsSpam = (
  content: string,
  config: GuildAutomodConfigRow
): DetectionResult => {
  if (content.length < config.caps_min_length) return { violation: null };
  if (/^\d+$/.test(content)) return { violation: null };
  if (/^[\W_]+$/.test(content)) return { violation: null };
  if (URL_REGEX.test(content)) return { violation: null };

  const ratio = getCapsRatio(content);
  if (ratio >= config.caps_threshold) {
    return {
      violation: {
        triggerType: 'CAPS_SPAM',
        actionType: config.default_action,
        reason: `Excessive caps: ${Math.round(ratio * 100)}% (threshold: ${Math.round(config.caps_threshold * 100)}%)`,
        shouldDelete: false,
        shouldPunish: false,
      },
    };
  }
  return { violation: null };
};

export const detectFlood = (
  timestamps: number[],
  config: GuildAutomodConfigRow
): DetectionResult => {
  const now = Date.now();
  const windowMs = config.flood_window_seconds * 1000;
  const recent = timestamps.filter((t) => now - t <= windowMs);

  if (recent.length >= config.flood_message_count) {
    return {
      violation: {
        triggerType: 'FLOOD',
        actionType: config.default_action,
        reason: `Flood detected: ${recent.length} messages in ${config.flood_window_seconds}s (limit: ${config.flood_message_count})`,
        shouldDelete: false,
        shouldPunish: config.default_action !== 'DELETE',
      },
    };
  }
  return { violation: null };
};

export interface RecentMessage {
  normalized: string;
  timestamp: number;
}

export const detectDuplicateMessage = (
  content: string,
  recentMessages: RecentMessage[],
  config: GuildAutomodConfigRow
): DetectionResult => {
  const normalized = normalizeForDuplicate(content);
  if (normalized.length < 5) return { violation: null };

  const windowMs = config.duplicate_window_seconds * 1000;
  const now = Date.now();
  const duplicateCount = recentMessages.filter(
    (m) => m.normalized === normalized && now - m.timestamp <= windowMs
  ).length;

  if (duplicateCount >= config.duplicate_message_limit) {
    return {
      violation: {
        triggerType: 'DUPLICATE_MESSAGE',
        actionType: config.default_action,
        reason: `Duplicate message sent ${duplicateCount} times (limit: ${config.duplicate_message_limit})`,
        shouldDelete: false,
        shouldPunish: false,
      },
      normalizedContent: normalized,
    };
  }
  return { violation: null, normalizedContent: normalized };
};

export const detectEmojiSpam = (
  content: string,
  config: GuildAutomodConfigRow
): DetectionResult => {
  const emojiCount = countEmoji(content);
  if (emojiCount > config.emoji_limit) {
    return {
      violation: {
        triggerType: 'EMOJI_SPAM',
        actionType: config.default_action,
        reason: `Excessive emojis: ${emojiCount} (limit: ${config.emoji_limit})`,
        shouldDelete: false,
        shouldPunish: false,
      },
    };
  }
  return { violation: null };
};
