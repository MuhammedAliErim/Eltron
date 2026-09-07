import { describe, it, expect } from 'vitest';
import {
  detectBannedWord,
  detectDiscordInvite,
  detectUrl,
  detectIpAddress,
  detectMentionSpam,
  detectCapsSpam,
  detectFlood,
  detectEmojiSpam,
} from '../src/services/security/DetectionEngine';
import { GuildAutomodConfigRow } from '../src/database/schema';

const defaultConfig: GuildAutomodConfigRow = {
  id: 1,
  guild_id: '123456789',
  enabled: true,
  default_action: 'DELETE',
  bypass_roles: [],
  bypass_channels: [],
  bypass_users: [],
  flood_message_count: 5,
  flood_window_seconds: 5,
  duplicate_message_limit: 3,
  duplicate_window_seconds: 60,
  mention_limit: 5,
  emoji_limit: 10,
  sticker_limit: 5,
  caps_threshold: 0.70,
  caps_min_length: 10,
  banned_words: ['badword', 'slur'],
  blocked_domains: ['spam.com', 'malware.net'],
  blocked_invites: true,
  log_channel_id: null,
  created_at: '',
  updated_at: '',
};

describe('DetectionEngine', () => {
  describe('detectBannedWord', () => {
    it('should detect banned words', () => {
      const result = detectBannedWord('this has a badword in it', defaultConfig);
      expect(result.violation).not.toBeNull();
      expect(result.violation!.triggerType).toBe('BANNED_WORD');
    });

    it('should be case insensitive', () => {
      const result = detectBannedWord('BADWORD test', defaultConfig);
      expect(result.violation).not.toBeNull();
    });

    it('should not flag clean messages', () => {
      const result = detectBannedWord('hello world', defaultConfig);
      expect(result.violation).toBeNull();
    });

    it('should handle empty banned words list', () => {
      const config = { ...defaultConfig, banned_words: [] };
      const result = detectBannedWord('badword', config);
      expect(result.violation).toBeNull();
    });
  });

  describe('detectDiscordInvite', () => {
    it('should detect discord.gg links', () => {
      const result = detectDiscordInvite('join us at discord.gg/abc123', defaultConfig);
      expect(result.violation).not.toBeNull();
      expect(result.violation!.triggerType).toBe('DISCORD_INVITE');
    });

    it('should detect discordapp.com/invite links', () => {
      const result = detectDiscordInvite('https://discordapp.com/invite/test', defaultConfig);
      expect(result.violation).not.toBeNull();
    });

    it('should detect discord.com/invite links', () => {
      const result = detectDiscordInvite('https://discord.com/invite/test', defaultConfig);
      expect(result.violation).not.toBeNull();
    });

    it('should not flag when invites not blocked', () => {
      const config = { ...defaultConfig, blocked_invites: false };
      const result = detectDiscordInvite('discord.gg/abc', config);
      expect(result.violation).toBeNull();
    });

    it('should not flag clean messages', () => {
      const result = detectDiscordInvite('hello world', defaultConfig);
      expect(result.violation).toBeNull();
    });
  });

  describe('detectUrl', () => {
    it('should detect blocked domains', () => {
      const result = detectUrl('visit spam.com now', defaultConfig);
      expect(result.violation).not.toBeNull();
      expect(result.violation!.triggerType).toBe('URL');
    });

    it('should be case insensitive', () => {
      const result = detectUrl('visit SPAM.COM now', defaultConfig);
      expect(result.violation).not.toBeNull();
    });

    it('should not flag when no blocked domains', () => {
      const config = { ...defaultConfig, blocked_domains: [] };
      const result = detectUrl('visit example.com', config);
      expect(result.violation).toBeNull();
    });

    it('should not flag clean messages', () => {
      const result = detectUrl('hello world', defaultConfig);
      expect(result.violation).toBeNull();
    });
  });

  describe('detectIpAddress', () => {
    it('should detect IP addresses', () => {
      const result = detectIpAddress('my ip is 192.168.1.1');
      expect(result.violation).not.toBeNull();
      expect(result.violation!.triggerType).toBe('IP_ADDRESS');
    });

    it('should not flag clean messages', () => {
      const result = detectIpAddress('hello world');
      expect(result.violation).toBeNull();
    });
  });

  describe('detectMentionSpam', () => {
    it('should detect excessive mentions', () => {
      const content = '<@123> <@456> <@789> <@101> <@112> <@131>';
      const result = detectMentionSpam(content, defaultConfig);
      expect(result.violation).not.toBeNull();
      expect(result.violation!.triggerType).toBe('MENTION_SPAM');
    });

    it('should not flag within limit', () => {
      const content = '<@123> <@456> <@789>';
      const result = detectMentionSpam(content, defaultConfig);
      expect(result.violation).toBeNull();
    });

    it('should count role mentions', () => {
      const content = '<@&123> <@&456> <@&789> <@&101> <@&112> <@&131>';
      const result = detectMentionSpam(content, defaultConfig);
      expect(result.violation).not.toBeNull();
    });

    it('should count @everyone and @here', () => {
      const content = '@everyone @everyone @everyone @everyone @everyone @everyone';
      const result = detectMentionSpam(content, defaultConfig);
      expect(result.violation).not.toBeNull();
    });
  });

  describe('detectCapsSpam', () => {
    it('should detect excessive caps', () => {
      const content = 'THIS IS ALL CAPS AND LONG ENOUGH';
      const result = detectCapsSpam(content, defaultConfig);
      expect(result.violation).not.toBeNull();
      expect(result.violation!.triggerType).toBe('CAPS_SPAM');
    });

    it('should not flag short messages', () => {
      const content = 'HI';
      const result = detectCapsSpam(content, defaultConfig);
      expect(result.violation).toBeNull();
    });

    it('should not flag numbers only', () => {
      const content = '123456789012345';
      const result = detectCapsSpam(content, defaultConfig);
      expect(result.violation).toBeNull();
    });

    it('should not flag symbols only', () => {
      const content = '!@#$%^&*()_+';
      const result = detectCapsSpam(content, defaultConfig);
      expect(result.violation).toBeNull();
    });

    it('should not flag URLs', () => {
      const content = 'HTTPS://EXAMPLE.COM/VERY/LONG/URL';
      const result = detectCapsSpam(content, defaultConfig);
      expect(result.violation).toBeNull();
    });
  });

  describe('detectFlood', () => {
    it('should detect flood', () => {
      const now = Date.now();
      const timestamps = [now - 4000, now - 3000, now - 2000, now - 1000, now];
      const result = detectFlood(timestamps, defaultConfig);
      expect(result.violation).not.toBeNull();
      expect(result.violation!.triggerType).toBe('FLOOD');
    });

    it('should not flag within limits', () => {
      const now = Date.now();
      const timestamps = [now - 4000, now - 3000, now - 2000];
      const result = detectFlood(timestamps, defaultConfig);
      expect(result.violation).toBeNull();
    });
  });

  describe('detectEmojiSpam', () => {
    it('should detect excessive emojis', () => {
      const content = '😀😀😀😀😀😀😀😀😀😀😀';
      const result = detectEmojiSpam(content, defaultConfig);
      expect(result.violation).not.toBeNull();
      expect(result.violation!.triggerType).toBe('EMOJI_SPAM');
    });

    it('should not flag within limit', () => {
      const content = '😀😀😀😀😀';
      const result = detectEmojiSpam(content, defaultConfig);
      expect(result.violation).toBeNull();
    });
  });
});
