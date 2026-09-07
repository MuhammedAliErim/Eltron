import { describe, it, expect, beforeEach } from 'vitest';
import {
  startVerification,
  submitVerification,
  handleButtonVerification,
  getVerificationState,
  resetVerification,
  createVerificationEmbed,
  cleanupVerificationStates,
} from '../src/services/security/VerificationService';
import { GuildVerificationConfigRow, GuildMember } from '../src/database/schema';

const createMockConfig = (overrides: Partial<GuildVerificationConfigRow> = {}): GuildVerificationConfigRow => ({
  id: 1,
  guild_id: 'guild1',
  enabled: true,
  verified_role_id: null,
  unverified_role_id: null,
  verification_timeout_seconds: 300,
  max_attempts: 3,
  rate_limit_window_seconds: 60,
  rate_limit_max_attempts: 5,
  log_channel_id: null,
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
          get: () => null,
          has: (id: string) => (overrides.roles || []).includes(id),
        },
      },
    },
    roles: {
      cache: {
        map: () => overrides.roles || [],
        has: (id: string) => (overrides.roles || []).includes(id),
      },
      highest: { position: overrides.highestPosition || 1 },
    },
  } as unknown as GuildMember;
};

describe('VerificationService', () => {
  beforeEach(() => {
    resetVerification('guild1', 'user1');
    resetVerification('guild1', 'user2');
    resetVerification('guild_bypass', 'owner1');
  });

  describe('startVerification', () => {
    it('should reject when disabled', async () => {
      const config = createMockConfig({ enabled: false });
      const member = createMockMember();
      const result = await startVerification(member, config);
      expect(result.success).toBe(false);
      expect(result.state).toBe('UNVERIFIED');
    });

    it('should bypass bots', async () => {
      const config = createMockConfig();
      const member = createMockMember({ bot: true });
      const result = await startVerification(member, config);
      expect(result.success).toBe(true);
      expect(result.state).toBe('VERIFIED');
    });

    it('should bypass guild owner', async () => {
      const config = createMockConfig();
      const member = createMockMember({ id: 'owner1', ownerId: 'owner1' });
      const result = await startVerification(member, config);
      expect(result.success).toBe(true);
      expect(result.state).toBe('VERIFIED');
    });

    it('should start verification for normal user', async () => {
      resetVerification('guild1', 'user1');
      const config = createMockConfig();
      const member = createMockMember();
      const result = await startVerification(member, config);
      expect(result.success).toBe(true);
      expect(result.state).toBe('PENDING');
      expect(result.challenge).toBeDefined();
    });

    it('should provide button challenge for LOW risk', async () => {
      resetVerification('guild1', 'user1');
      const config = createMockConfig();
      const member = createMockMember();
      const result = await startVerification(member, config);
      expect(result.challenge?.type).toBe('button');
    });

    it('should expire after max attempts', async () => {
      resetVerification('guild1', 'user1');
      const config = createMockConfig({ max_attempts: 2 });
      const member = createMockMember();

      await startVerification(member, config);
      await startVerification(member, config);
      const result = await startVerification(member, config);

      expect(result.state).toBe('EXPIRED');
    });
  });

  describe('submitVerification', () => {
    it('should reject when disabled', async () => {
      const config = createMockConfig({ enabled: false });
      const member = createMockMember();
      const result = await submitVerification(member, config, 'ABC123');
      expect(result.success).toBe(false);
    });

    it('should reject without active session', async () => {
      resetVerification('guild1', 'user1');
      const config = createMockConfig();
      const member = createMockMember();
      const result = await submitVerification(member, config, 'ABC123');
      expect(result.success).toBe(false);
      expect(result.state).toBe('UNVERIFIED');
    });

    it('should fail with wrong code', async () => {
      resetVerification('guild1', 'user1');
      const config = createMockConfig();
      const member = createMockMember();

      const start = await startVerification(member, config);
      expect(start.challenge?.challengeCode).toBeDefined();

      const result = await submitVerification(member, config, 'WRONG');
      expect(result.success).toBe(false);
      expect(result.state).toBe('FAILED');
    });

    it('should succeed with correct code', async () => {
      resetVerification('guild1', 'user1');
      const config = createMockConfig();
      const member = createMockMember();

      const start = await startVerification(member, config);
      const code = start.challenge?.challengeCode || '';

      const result = await submitVerification(member, config, code);
      expect(result.success).toBe(true);
      expect(result.state).toBe('VERIFIED');
    });

    it('should be case insensitive', async () => {
      resetVerification('guild1', 'user1');
      const config = createMockConfig();
      const member = createMockMember();

      const start = await startVerification(member, config);
      const code = start.challenge?.challengeCode || '';

      const result = await submitVerification(member, config, code.toLowerCase());
      expect(result.success).toBe(true);
    });
  });

  describe('handleButtonVerification', () => {
    it('should reject when disabled', async () => {
      const config = createMockConfig({ enabled: false });
      const member = createMockMember();
      const result = await handleButtonVerification(member, config);
      expect(result.success).toBe(false);
    });

    it('should bypass bots', async () => {
      const config = createMockConfig();
      const member = createMockMember({ bot: true });
      const result = await handleButtonVerification(member, config);
      expect(result.success).toBe(true);
    });

    it('should succeed for normal user', async () => {
      resetVerification('guild1', 'user1');
      const config = createMockConfig();
      const member = createMockMember();
      const result = await handleButtonVerification(member, config);
      expect(result.success).toBe(true);
      expect(result.state).toBe('VERIFIED');
    });
  });

  describe('getVerificationState', () => {
    it('should return UNVERIFIED for unknown', () => {
      expect(getVerificationState('unknown', 'unknown')).toBe('UNVERIFIED');
    });
  });

  describe('resetVerification', () => {
    it('should reset state', async () => {
      const config = createMockConfig();
      const member = createMockMember();
      await startVerification(member, config);
      expect(getVerificationState('guild1', 'user1')).toBe('PENDING');

      resetVerification('guild1', 'user1');
      expect(getVerificationState('guild1', 'user1')).toBe('UNVERIFIED');
    });
  });

  describe('guild isolation', () => {
    it('should isolate between guilds', async () => {
      resetVerification('guild_a', 'user1');
      resetVerification('guild_b', 'user1');

      const configA = createMockConfig({ guild_id: 'guild_a' });
      const memberA = createMockMember({ guildId: 'guild_a' });
      await startVerification(memberA, configA);

      expect(getVerificationState('guild_a', 'user1')).toBe('PENDING');
      expect(getVerificationState('guild_b', 'user1')).toBe('UNVERIFIED');
    });
  });

  describe('user isolation', () => {
    it('should isolate between users', async () => {
      resetVerification('guild1', 'user1');
      resetVerification('guild1', 'user2');

      const config = createMockConfig();
      const member1 = createMockMember({ id: 'user1' });
      await startVerification(member1, config);

      expect(getVerificationState('guild1', 'user1')).toBe('PENDING');
      expect(getVerificationState('guild1', 'user2')).toBe('UNVERIFIED');
    });
  });

  describe('createVerificationEmbed', () => {
    it('should create embed for button challenge', () => {
      const config = createMockConfig();
      const member = createMockMember();
      const { embed, row } = createVerificationEmbed(member, config, { type: 'button' });
      expect(embed).toBeDefined();
      expect(row).toBeDefined();
    });

    it('should create embed for code challenge', () => {
      const config = createMockConfig();
      const member = createMockMember();
      const { embed, row } = createVerificationEmbed(member, config, {
        type: 'code',
        question: 'Enter code: **{code}**',
        challengeCode: 'ABC123',
      });
      expect(embed).toBeDefined();
      expect(row).toBeUndefined();
    });
  });

  describe('cleanupVerificationStates', () => {
    it('should not throw', () => {
      expect(() => cleanupVerificationStates()).not.toThrow();
    });
  });
});
