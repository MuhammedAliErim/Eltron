import { describe, it, expect } from 'vitest';
import {
  processMemberJoin,
  getRaidState,
  resetRaidState,
  shouldTakeAction,
  getRaidAction,
  getJoinStats,
  cleanupRaidStates,
} from '../src/services/security/AntiRaidService';
import { GuildAntiRaidConfigRow } from '../src/database/schema';
import { GuildMember } from 'discord.js';

const createMockConfig = (overrides: Partial<GuildAntiRaidConfigRow> = {}): GuildAntiRaidConfigRow => ({
  id: 1,
  guild_id: 'guild1',
  enabled: true,
  join_rate_limit: 10,
  join_rate_window_seconds: 10,
  account_age_threshold_days: 7,
  burst_threshold: 5,
  burst_window_seconds: 3,
  raid_action: 'KICK',
  auto_lockdown: false,
  lockdown_duration_seconds: 300,
  bypass_roles: [],
  bypass_users: [],
  log_channel_id: null,
  created_at: '',
  updated_at: '',
  ...overrides,
});

const createMockMember = (overrides: {
  id?: string;
  guildId?: string;
  bot?: boolean;
  createdTimestamp?: number;
  ownerId?: string;
  highestPosition?: number;
  botHighestPosition?: number;
  roles?: string[];
} = {}): GuildMember => {
  const now = Date.now();
  const userId = overrides.id || 'user1';
  const guildId = overrides.guildId || 'guild1';

  return {
    id: userId,
    user: {
      id: userId,
      bot: overrides.bot || false,
      tag: `User#${userId}`,
      createdTimestamp: overrides.createdTimestamp || now - (30 * 24 * 60 * 60 * 1000),
    },
    guild: {
      id: guildId,
      ownerId: overrides.ownerId || 'owner1',
      members: {
        me: {
          roles: {
            highest: { position: overrides.botHighestPosition || 10 },
          },
        },
      },
      channels: { cache: { get: () => null } },
    },
    roles: {
      cache: {
        map: () => overrides.roles || [],
      },
      highest: { position: overrides.highestPosition || 1 },
    },
  } as unknown as GuildMember;
};

describe('AntiRaidService', () => {
  describe('processMemberJoin', () => {
    it('should not detect raid when disabled', async () => {
      const config = createMockConfig({ enabled: false });
      const member = createMockMember();
      const result = await processMemberJoin(member, config);
      expect(result.detected).toBe(false);
    });

    it('should not detect raid for bot users', async () => {
      const config = createMockConfig();
      const member = createMockMember({ bot: true });
      const result = await processMemberJoin(member, config);
      expect(result.detected).toBe(false);
    });

    it('should not detect raid for bypassed users', async () => {
      const config = createMockConfig({ bypass_users: ['user1'] });
      const member = createMockMember({ id: 'user1' });
      const result = await processMemberJoin(member, config);
      expect(result.detected).toBe(false);
    });

    it('should not detect raid for guild owner', async () => {
      const config = createMockConfig();
      const member = createMockMember({ id: 'owner1', ownerId: 'owner1' });
      const result = await processMemberJoin(member, config);
      expect(result.detected).toBe(false);
    });

    it('should not detect single join', async () => {
      resetRaidState('guild_single');
      const config = createMockConfig({ guild_id: 'guild_single' });
      const member = createMockMember({ guildId: 'guild_single' });
      const result = await processMemberJoin(member, config);
      expect(result.detected).toBe(false);
      resetRaidState('guild_single');
    });

    it('should detect join rate exceeded', async () => {
      resetRaidState('guild_rate');
      const config = createMockConfig({
        guild_id: 'guild_rate',
        join_rate_limit: 3,
        join_rate_window_seconds: 60,
      });

      for (let i = 0; i < 3; i++) {
        const member = createMockMember({ id: `user_rate_${i}`, guildId: 'guild_rate' });
        await processMemberJoin(member, config);
      }

      const lastMember = createMockMember({ id: 'user_rate_final', guildId: 'guild_rate' });
      const result = await processMemberJoin(lastMember, config);
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('Join rate exceeded');
      resetRaidState('guild_rate');
    });

    it('should detect burst', async () => {
      resetRaidState('guild_burst');
      const config = createMockConfig({
        guild_id: 'guild_burst',
        burst_threshold: 3,
        burst_window_seconds: 5,
      });

      for (let i = 0; i < 3; i++) {
        const member = createMockMember({ id: `user_burst_${i}`, guildId: 'guild_burst' });
        await processMemberJoin(member, config);
      }

      const lastMember = createMockMember({ id: 'user_burst_final', guildId: 'guild_burst' });
      const result = await processMemberJoin(lastMember, config);
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('Join burst');
      resetRaidState('guild_burst');
    });

    it('should detect young account burst', async () => {
      resetRaidState('guild_young');
      const now = Date.now();
      const youngAge = 2 * 24 * 60 * 60 * 1000;
      const config = createMockConfig({
        guild_id: 'guild_young',
        burst_threshold: 3,
        burst_window_seconds: 60,
        account_age_threshold_days: 7,
      });

      for (let i = 0; i < 3; i++) {
        const member = createMockMember({
          id: `user_young_${i}`,
          guildId: 'guild_young',
          createdTimestamp: now - youngAge,
        });
        await processMemberJoin(member, config);
      }

      const lastMember = createMockMember({
        id: 'user_young_final',
        guildId: 'guild_young',
        createdTimestamp: now - youngAge,
      });
      const result = await processMemberJoin(lastMember, config);
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('Young account burst');
      resetRaidState('guild_young');
    });
  });

  describe('raid state transitions', () => {
    it('should transition NORMAL to SUSPECTED on detection', async () => {
      resetRaidState('guild_state');
      const config = createMockConfig({
        guild_id: 'guild_state',
        join_rate_limit: 2,
        join_rate_window_seconds: 60,
      });

      expect(getRaidState('guild_state')).toBe('NORMAL');

      const m1 = createMockMember({ id: 's_user1', guildId: 'guild_state' });
      await processMemberJoin(m1, config);
      expect(getRaidState('guild_state')).toBe('NORMAL');

      const m2 = createMockMember({ id: 's_user2', guildId: 'guild_state' });
      await processMemberJoin(m2, config);
      expect(getRaidState('guild_state')).toBe('SUSPECTED');

      resetRaidState('guild_state');
    });

    it('should transition SUSPECTED to RAID on second detection', async () => {
      resetRaidState('guild_raid');
      const config = createMockConfig({
        guild_id: 'guild_raid',
        join_rate_limit: 2,
        join_rate_window_seconds: 60,
        burst_threshold: 2,
        burst_window_seconds: 60,
      });

      const m1 = createMockMember({ id: 'r_user1', guildId: 'guild_raid' });
      await processMemberJoin(m1, config);

      const m2 = createMockMember({ id: 'r_user2', guildId: 'guild_raid' });
      await processMemberJoin(m2, config);
      expect(getRaidState('guild_raid')).toBe('SUSPECTED');

      const m3 = createMockMember({ id: 'r_user3', guildId: 'guild_raid' });
      await processMemberJoin(m3, config);
      expect(getRaidState('guild_raid')).toBe('RAID');

      resetRaidState('guild_raid');
    });

    it('should reset state manually', async () => {
      resetRaidState('guild_reset');
      const config = createMockConfig({
        guild_id: 'guild_reset',
        join_rate_limit: 1,
        join_rate_window_seconds: 60,
      });

      const m1 = createMockMember({ id: 'reset_user1', guildId: 'guild_reset' });
      await processMemberJoin(m1, config);
      expect(getRaidState('guild_reset')).toBe('SUSPECTED');

      resetRaidState('guild_reset');
      expect(getRaidState('guild_reset')).toBe('NORMAL');
    });
  });

  describe('shouldTakeAction', () => {
    it('should return false when not in RAID state', () => {
      resetRaidState('guild_action');
      expect(shouldTakeAction('guild_action')).toBe(false);
    });

    it('should throttle actions to 5s', async () => {
      resetRaidState('guild_throttle');
      const config = createMockConfig({
        guild_id: 'guild_throttle',
        join_rate_limit: 1,
        join_rate_window_seconds: 60,
        burst_threshold: 1,
        burst_window_seconds: 60,
      });

      const m1 = createMockMember({ id: 't_user1', guildId: 'guild_throttle' });
      await processMemberJoin(m1, config);
      const m2 = createMockMember({ id: 't_user2', guildId: 'guild_throttle' });
      await processMemberJoin(m2, config);

      expect(getRaidState('guild_throttle')).toBe('RAID');
      expect(shouldTakeAction('guild_throttle')).toBe(true);
      expect(shouldTakeAction('guild_throttle')).toBe(false);

      resetRaidState('guild_throttle');
    });
  });

  describe('getRaidAction', () => {
    it('should return configured action', () => {
      expect(getRaidAction(createMockConfig({ raid_action: 'KICK' }))).toBe('KICK');
      expect(getRaidAction(createMockConfig({ raid_action: 'BAN' }))).toBe('BAN');
      expect(getRaidAction(createMockConfig({ raid_action: 'NONE' }))).toBe('NONE');
    });
  });

  describe('getJoinStats', () => {
    it('should return empty stats for unknown guild', () => {
      const stats = getJoinStats('nonexistent');
      expect(stats.total).toBe(0);
      expect(stats.young).toBe(0);
      expect(stats.state).toBe('NORMAL');
    });
  });

  describe('guild isolation', () => {
    it('should isolate state between guilds', async () => {
      resetRaidState('guild_iso_a');
      resetRaidState('guild_iso_b');

      const configA = createMockConfig({ guild_id: 'guild_iso_a', join_rate_limit: 1, join_rate_window_seconds: 60 });
      const configB = createMockConfig({ guild_id: 'guild_iso_b', join_rate_limit: 100, join_rate_window_seconds: 60 });

      const mA = createMockMember({ id: 'iso_user', guildId: 'guild_iso_a' });
      await processMemberJoin(mA, configA);
      expect(getRaidState('guild_iso_a')).toBe('SUSPECTED');

      const mB = createMockMember({ id: 'iso_user', guildId: 'guild_iso_b' });
      await processMemberJoin(mB, configB);
      expect(getRaidState('guild_iso_b')).toBe('NORMAL');

      resetRaidState('guild_iso_a');
      resetRaidState('guild_iso_b');
    });
  });

  describe('cleanupRaidStates', () => {
    it('should not throw', () => {
      expect(() => cleanupRaidStates()).not.toThrow();
    });
  });
});
