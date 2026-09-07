import { describe, it, expect, beforeEach } from 'vitest';
import {
  quarantineMember,
  releaseMember,
  checkAutoQuarantine,
  getQuarantineInfo,
  createQuarantineEmbed,
  cleanupQuarantineStates,
  resetQuarantine,
} from '../src/services/security/QuarantineService';
import { GuildQuarantineConfigRow, GuildMember } from '../src/database/schema';

const createMockConfig = (overrides: Partial<GuildQuarantineConfigRow> = {}): GuildQuarantineConfigRow => ({
  id: 1,
  guild_id: 'guild1',
  enabled: true,
  quarantine_role_id: 'role_quarantine',
  auto_quarantine_on_risk: true,
  auto_quarantine_risk_level: 'HIGH',
  quarantine_duration_seconds: 3600,
  max_quarantine_duration_seconds: 86400,
  log_channel_id: null,
  bypass_roles: [],
  bypass_users: [],
  created_at: '',
  updated_at: '',
  ...overrides,
});

const createMockMember = (overrides: {
  id?: string;
  guildId?: string;
  bot?: boolean;
  ownerId?: string;
  roles?: string[];
  highestPosition?: number;
  botHighestPosition?: number;
} = {}): GuildMember => {
  const userId = overrides.id || 'user1';
  const guildId = overrides.guildId || 'guild1';

  return {
    id: userId,
    user: {
      id: userId,
      bot: overrides.bot || false,
      tag: `User#${userId}`,
      createdTimestamp: Date.now() - (30 * 24 * 60 * 60 * 1000),
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
      roles: {
        cache: {
          get: (id: string) => (id === 'role_quarantine' ? { position: 1 } : null),
          has: (id: string) => (overrides.roles || []).includes(id),
        },
      },
    },
    roles: {
      cache: {
        map: () => overrides.roles || [],
        has: (id: string) => (overrides.roles || []).includes(id),
        add: async () => {},
        remove: async () => {},
      },
      highest: { position: overrides.highestPosition || 1 },
      add: async () => {},
      remove: async () => {},
    },
  } as unknown as GuildMember;
};

describe('QuarantineService', () => {
  beforeEach(() => {
    cleanupQuarantineStates();
    resetQuarantine('guild1', 'user1');
    resetQuarantine('guild1', 'user2');
    resetQuarantine('guild_bypass', 'user_bypass');
  });

  describe('quarantineMember', () => {
    it('should reject when disabled', async () => {
      const config = createMockConfig({ enabled: false });
      const member = createMockMember();
      const result = await quarantineMember(member, config, 'test reason', null);
      expect(result.success).toBe(false);
      expect(result.quarantined).toBe(false);
    });

    it('should reject without quarantine role', async () => {
      const config = createMockConfig({ quarantine_role_id: null });
      const member = createMockMember();
      const result = await quarantineMember(member, config, 'test reason', null);
      expect(result.success).toBe(false);
    });

    it('should reject bots', async () => {
      const config = createMockConfig();
      const member = createMockMember({ bot: true });
      const result = await quarantineMember(member, config, 'test reason', null);
      expect(result.success).toBe(false);
    });

    it('should reject guild owner', async () => {
      const config = createMockConfig();
      const member = createMockMember({ id: 'owner1', ownerId: 'owner1' });
      const result = await quarantineMember(member, config, 'test reason', null);
      expect(result.success).toBe(false);
    });

    it('should reject bypass users', async () => {
      const config = createMockConfig({ bypass_users: ['user_bypass'] });
      const member = createMockMember({ id: 'user_bypass' });
      const result = await quarantineMember(member, config, 'test reason', null);
      expect(result.success).toBe(false);
    });

    it('should reject bypass roles', async () => {
      const config = createMockConfig({ bypass_roles: ['role_bypass'] });
      const member = createMockMember({ roles: ['role_bypass'] });
      const result = await quarantineMember(member, config, 'test reason', null);
      expect(result.success).toBe(false);
    });

    it('should quarantine normal user', async () => {
      const config = createMockConfig();
      const member = createMockMember();
      const result = await quarantineMember(member, config, 'test reason', 'admin1');
      expect(result.success).toBe(true);
      expect(result.quarantined).toBe(true);
    });

    it('should reject already quarantined user', async () => {
      const config = createMockConfig();
      const member = createMockMember();
      await quarantineMember(member, config, 'first', 'admin1');
      const result = await quarantineMember(member, config, 'second', 'admin1');
      expect(result.success).toBe(false);
    });

    it('should use custom duration', async () => {
      const config = createMockConfig();
      const member = createMockMember();
      const result = await quarantineMember(member, config, 'test', 'admin1', 600);
      expect(result.success).toBe(true);
    });

    it('should cap at max duration', async () => {
      const config = createMockConfig({ max_quarantine_duration_seconds: 120 });
      const member = createMockMember();
      const result = await quarantineMember(member, config, 'test', 'admin1', 999999);
      expect(result.success).toBe(true);
    });
  });

  describe('releaseMember', () => {
    it('should reject when not quarantined', async () => {
      const config = createMockConfig();
      const member = createMockMember();
      const result = await releaseMember(member, config, 'admin1');
      expect(result.success).toBe(false);
    });

    it('should release quarantined user', async () => {
      const config = createMockConfig();
      const member = createMockMember();
      await quarantineMember(member, config, 'test', 'admin1');
      const result = await releaseMember(member, config, 'admin1');
      expect(result.success).toBe(true);
    });

    it('should allow re-quarantine after release', async () => {
      const config = createMockConfig();
      const member = createMockMember();
      await quarantineMember(member, config, 'first', 'admin1');
      await releaseMember(member, config, 'admin1');
      const result = await quarantineMember(member, config, 'second', 'admin1');
      expect(result.success).toBe(true);
    });
  });

  describe('checkAutoQuarantine', () => {
    it('should not trigger when disabled', async () => {
      const config = createMockConfig({ enabled: false });
      const member = createMockMember();
      const result = await checkAutoQuarantine(member, config);
      expect(result.triggered).toBe(false);
    });

    it('should not trigger when auto-quarantine disabled', async () => {
      const config = createMockConfig({ auto_quarantine_on_risk: false });
      const member = createMockMember();
      const result = await checkAutoQuarantine(member, config);
      expect(result.triggered).toBe(false);
    });

    it('should not trigger for bots', async () => {
      const config = createMockConfig();
      const member = createMockMember({ bot: true });
      const result = await checkAutoQuarantine(member, config);
      expect(result.triggered).toBe(false);
    });

    it('should not trigger for owners', async () => {
      const config = createMockConfig();
      const member = createMockMember({ id: 'owner1', ownerId: 'owner1' });
      const result = await checkAutoQuarantine(member, config);
      expect(result.triggered).toBe(false);
    });
  });

  describe('getQuarantineInfo', () => {
    it('should return not quarantined for unknown', () => {
      const info = getQuarantineInfo('guild1', 'unknown');
      expect(info.quarantined).toBe(false);
    });
  });

  describe('guild isolation', () => {
    it('should isolate between guilds', async () => {
      const configA = createMockConfig({ guild_id: 'guild_a' });
      const configB = createMockConfig({ guild_id: 'guild_b' });
      const memberA = createMockMember({ id: 'user1', guildId: 'guild_a' });
      const memberB = createMockMember({ id: 'user1', guildId: 'guild_b' });

      await quarantineMember(memberA, configA, 'test', 'admin1');

      expect(getQuarantineInfo('guild_a', 'user1').quarantined).toBe(true);
      expect(getQuarantineInfo('guild_b', 'user1').quarantined).toBe(false);
    });
  });

  describe('user isolation', () => {
    it('should isolate between users', async () => {
      const config = createMockConfig();
      const member1 = createMockMember({ id: 'user1' });
      const member2 = createMockMember({ id: 'user2' });

      await quarantineMember(member1, config, 'test', 'admin1');

      expect(getQuarantineInfo('guild1', 'user1').quarantined).toBe(true);
      expect(getQuarantineInfo('guild1', 'user2').quarantined).toBe(false);
    });
  });

  describe('createQuarantineEmbed', () => {
    it('should create quarantine embed', () => {
      const member = createMockMember();
      const embed = createQuarantineEmbed(member, 'QUARANTINE', 'test reason', 'admin1', 3600);
      expect(embed).toBeDefined();
    });

    it('should create release embed', () => {
      const member = createMockMember();
      const embed = createQuarantineEmbed(member, 'RELEASE', 'released', 'admin1');
      expect(embed).toBeDefined();
    });
  });

  describe('cleanupQuarantineStates', () => {
    it('should not throw', () => {
      expect(() => cleanupQuarantineStates()).not.toThrow();
    });
  });
});
