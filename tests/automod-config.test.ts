import { describe, it, expect } from 'vitest';
import { isBypassed } from '../src/services/security/AutomodConfig';
import { GuildAutomodConfigRow } from '../src/database/schema';

const baseConfig: GuildAutomodConfigRow = {
  id: 1,
  guild_id: '123',
  enabled: true,
  default_action: 'DELETE',
  bypass_roles: ['admin_role', 'mod_role'],
  bypass_channels: ['111', '222'],
  bypass_users: ['user1', 'user2'],
  flood_message_count: 5,
  flood_window_seconds: 5,
  duplicate_message_limit: 3,
  duplicate_window_seconds: 60,
  mention_limit: 5,
  emoji_limit: 10,
  sticker_limit: 5,
  caps_threshold: 0.70,
  caps_min_length: 10,
  banned_words: [],
  blocked_domains: [],
  blocked_invites: true,
  log_channel_id: null,
  created_at: '',
  updated_at: '',
};

describe('AutomodConfig', () => {
  describe('isBypassed', () => {
    it('should return true for bypassed user', () => {
      expect(isBypassed(baseConfig, 'user1', '999', [])).toBe(true);
    });

    it('should return true for bypassed channel', () => {
      expect(isBypassed(baseConfig, '999', '111', [])).toBe(true);
    });

    it('should return true for bypassed role', () => {
      expect(isBypassed(baseConfig, '999', '999', ['admin_role'])).toBe(true);
    });

    it('should return false when not bypassed', () => {
      expect(isBypassed(baseConfig, '999', '999', ['regular_role'])).toBe(false);
    });

    it('should return false with empty bypass lists', () => {
      const config = { ...baseConfig, bypass_roles: [], bypass_channels: [], bypass_users: [] };
      expect(isBypassed(config, '999', '999', ['role'])).toBe(false);
    });
  });
});
