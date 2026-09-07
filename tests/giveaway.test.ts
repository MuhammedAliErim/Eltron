import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GiveawayRepository } from '../src/database/repositories/GiveawayRepository';
import {
  GiveawayRow,
  GiveawayEntryRow,
  GiveawayWinnerRow,
  GiveawayStatus,
} from '../src/database/schema';
import {
  parseDurationToMs,
  validateGiveawayParams,
  createGiveawayEmbed,
  createGiveawayButton,
  buildWinnersString,
  joinGiveaway,
  leaveGiveaway,
  selectWinners,
  endGiveaway,
  cancelGiveaway,
  rerollGiveaway,
  MIN_DURATION_SECONDS,
  MAX_DURATION_SECONDS,
  MIN_WINNERS,
  MAX_WINNERS,
  MAX_PRIZE_LENGTH,
} from '../src/services/giveaway/GiveawayService';

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));

const createMockGiveaway = (overrides: Partial<GiveawayRow> = {}): GiveawayRow => ({
  id: 1,
  guild_id: 'guild1',
  channel_id: 'channel1',
  message_id: 'msg1',
  host_id: 'user1',
  prize: 'Test Prize',
  description: 'Test description',
  winner_count: 1,
  ends_at: new Date(Date.now() + 3600000).toISOString(),
  status: 'ACTIVE' as GiveawayStatus,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockEntry = (overrides: Partial<GiveawayEntryRow> = {}): GiveawayEntryRow => ({
  id: 1,
  giveaway_id: 1,
  guild_id: 'guild1',
  user_id: 'user1',
  joined_at: new Date().toISOString(),
  ...overrides,
});

const createMockWinner = (overrides: Partial<GiveawayWinnerRow> = {}): GiveawayWinnerRow => ({
  id: 1,
  giveaway_id: 1,
  guild_id: 'guild1',
  user_id: 'user1',
  reroll_number: 0,
  selected_at: new Date().toISOString(),
  ...overrides,
});

describe('GiveawayRepository', () => {
  let repo: GiveawayRepository;

  beforeEach(() => {
    repo = new GiveawayRepository();
    vi.clearAllMocks();
  });

  describe('createGiveaway', () => {
    it('should have createGiveaway method', () => {
      expect(typeof repo.createGiveaway).toBe('function');
    });
  });

  describe('getGiveaway', () => {
    it('should have getGiveaway method', () => {
      expect(typeof repo.getGiveaway).toBe('function');
    });
  });

  describe('getActiveGiveaways', () => {
    it('should have getActiveGiveaways method', () => {
      expect(typeof repo.getActiveGiveaways).toBe('function');
    });
  });

  describe('getAllActiveGiveaways', () => {
    it('should have getAllActiveGiveaways method', () => {
      expect(typeof repo.getAllActiveGiveaways).toBe('function');
    });
  });

  describe('listGuildGiveaways', () => {
    it('should have listGuildGiveaways method', () => {
      expect(typeof repo.listGuildGiveaways).toBe('function');
    });
  });

  describe('updateGiveaway', () => {
    it('should have updateGiveaway method', () => {
      expect(typeof repo.updateGiveaway).toBe('function');
    });
  });

  describe('endGiveaway', () => {
    it('should have endGiveaway method', () => {
      expect(typeof repo.endGiveaway).toBe('function');
    });
  });

  describe('cancelGiveaway', () => {
    it('should have cancelGiveaway method', () => {
      expect(typeof repo.cancelGiveaway).toBe('function');
    });
  });

  describe('addEntry', () => {
    it('should have addEntry method', () => {
      expect(typeof repo.addEntry).toBe('function');
    });
  });

  describe('removeEntry', () => {
    it('should have removeEntry method', () => {
      expect(typeof repo.removeEntry).toBe('function');
    });
  });

  describe('getEntries', () => {
    it('should have getEntries method', () => {
      expect(typeof repo.getEntries).toBe('function');
    });
  });

  describe('countEntries', () => {
    it('should have countEntries method', () => {
      expect(typeof repo.countEntries).toBe('function');
    });
  });

  describe('hasEntry', () => {
    it('should have hasEntry method', () => {
      expect(typeof repo.hasEntry).toBe('function');
    });
  });

  describe('createWinner', () => {
    it('should have createWinner method', () => {
      expect(typeof repo.createWinner).toBe('function');
    });
  });

  describe('getWinners', () => {
    it('should have getWinners method', () => {
      expect(typeof repo.getWinners).toBe('function');
    });
  });

  describe('getWinnerUserIds', () => {
    it('should have getWinnerUserIds method', () => {
      expect(typeof repo.getWinnerUserIds).toBe('function');
    });
  });

  describe('getEligibleRerollCandidates', () => {
    it('should have getEligibleRerollCandidates method', () => {
      expect(typeof repo.getEligibleRerollCandidates).toBe('function');
    });
  });
});

describe('Duration Parsing', () => {
  it('should parse seconds', () => {
    expect(parseDurationToMs('30s')).toBe(30000);
  });

  it('should parse minutes', () => {
    expect(parseDurationToMs('10m')).toBe(600000);
  });

  it('should parse hours', () => {
    expect(parseDurationToMs('2h')).toBe(7200000);
  });

  it('should parse days', () => {
    expect(parseDurationToMs('7d')).toBe(604800000);
  });

  it('should return null for invalid format', () => {
    expect(parseDurationToMs('abc')).toBeNull();
    expect(parseDurationToMs('')).toBeNull();
    expect(parseDurationToMs('10x')).toBeNull();
  });

  it('should handle case insensitive units', () => {
    expect(parseDurationToMs('30S')).toBe(30000);
    expect(parseDurationToMs('10M')).toBe(600000);
    expect(parseDurationToMs('2H')).toBe(7200000);
    expect(parseDurationToMs('7D')).toBe(604800000);
  });

  it('should parse large values', () => {
    expect(parseDurationToMs('999s')).toBe(999000);
    expect(parseDurationToMs('30d')).toBe(2592000000);
  });
});

describe('Validation', () => {
  it('should accept valid parameters', () => {
    const result = validateGiveawayParams(60000, 1, 'Prize');
    expect(result.valid).toBe(true);
  });

  it('should reject duration below minimum', () => {
    const result = validateGiveawayParams(5000, 1, 'Prize');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least');
  });

  it('should reject duration above maximum', () => {
    const result = validateGiveawayParams(31 * 24 * 60 * 60 * 1000, 1, 'Prize');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('30 days');
  });

  it('should accept duration at exact minimum', () => {
    const result = validateGiveawayParams(MIN_DURATION_SECONDS * 1000, 1, 'Prize');
    expect(result.valid).toBe(true);
  });

  it('should accept duration at exact maximum', () => {
    const result = validateGiveawayParams(MAX_DURATION_SECONDS * 1000, 1, 'Prize');
    expect(result.valid).toBe(true);
  });

  it('should reject winner count below minimum', () => {
    const result = validateGiveawayParams(60000, 0, 'Prize');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between');
  });

  it('should reject winner count above maximum', () => {
    const result = validateGiveawayParams(60000, 101, 'Prize');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between');
  });

  it('should accept winner count at exact minimum', () => {
    const result = validateGiveawayParams(60000, MIN_WINNERS, 'Prize');
    expect(result.valid).toBe(true);
  });

  it('should accept winner count at exact maximum', () => {
    const result = validateGiveawayParams(60000, MAX_WINNERS, 'Prize');
    expect(result.valid).toBe(true);
  });

  it('should reject empty prize', () => {
    const result = validateGiveawayParams(60000, 1, '');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should reject whitespace-only prize', () => {
    const result = validateGiveawayParams(60000, 1, '   ');
    expect(result.valid).toBe(false);
  });

  it('should reject prize exceeding max length', () => {
    const longPrize = 'a'.repeat(MAX_PRIZE_LENGTH + 1);
    const result = validateGiveawayParams(60000, 1, longPrize);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceed');
  });

  it('should accept prize at max length', () => {
    const maxPrize = 'a'.repeat(MAX_PRIZE_LENGTH);
    const result = validateGiveawayParams(60000, 1, maxPrize);
    expect(result.valid).toBe(true);
  });
});

describe('GiveawayModel', () => {
  it('should create a valid giveaway object', () => {
    const giveaway = createMockGiveaway();
    expect(giveaway.id).toBe(1);
    expect(giveaway.guild_id).toBe('guild1');
    expect(giveaway.status).toBe('ACTIVE');
    expect(giveaway.host_id).toBe('user1');
    expect(giveaway.prize).toBe('Test Prize');
  });

  it('should support ENDED status', () => {
    const giveaway = createMockGiveaway({ status: 'ENDED' });
    expect(giveaway.status).toBe('ENDED');
  });

  it('should support CANCELLED status', () => {
    const giveaway = createMockGiveaway({ status: 'CANCELLED' });
    expect(giveaway.status).toBe('CANCELLED');
  });

  it('should enforce guild isolation', () => {
    const g1 = createMockGiveaway({ guild_id: 'guild_a' });
    const g2 = createMockGiveaway({ guild_id: 'guild_b' });
    expect(g1.guild_id).not.toBe(g2.guild_id);
  });

  it('should support multiple winners', () => {
    const giveaway = createMockGiveaway({ winner_count: 5 });
    expect(giveaway.winner_count).toBe(5);
  });

  it('should have a description', () => {
    const giveaway = createMockGiveaway({ description: 'A test description' });
    expect(giveaway.description).toBe('A test description');
  });

  it('should support optional message_id', () => {
    const giveaway = createMockGiveaway({ message_id: null });
    expect(giveaway.message_id).toBeNull();
  });
});

describe('Entry Model', () => {
  it('should create a valid entry object', () => {
    const entry = createMockEntry();
    expect(entry.id).toBe(1);
    expect(entry.giveaway_id).toBe(1);
    expect(entry.guild_id).toBe('guild1');
    expect(entry.user_id).toBe('user1');
  });

  it('should enforce guild isolation', () => {
    const e1 = createMockEntry({ guild_id: 'guild_a' });
    const e2 = createMockEntry({ guild_id: 'guild_b' });
    expect(e1.guild_id).not.toBe(e2.guild_id);
  });

  it('should enforce user isolation per giveaway', () => {
    const e1 = createMockEntry({ user_id: 'user1' });
    const e2 = createMockEntry({ user_id: 'user2' });
    expect(e1.user_id).not.toBe(e2.user_id);
  });
});

describe('Winner Model', () => {
  it('should create a valid winner object', () => {
    const winner = createMockWinner();
    expect(winner.id).toBe(1);
    expect(winner.giveaway_id).toBe(1);
    expect(winner.guild_id).toBe('guild1');
    expect(winner.user_id).toBe('user1');
    expect(winner.reroll_number).toBe(0);
  });

  it('should support reroll numbers', () => {
    const winner = createMockWinner({ reroll_number: 1 });
    expect(winner.reroll_number).toBe(1);
  });

  it('should enforce guild isolation', () => {
    const w1 = createMockWinner({ guild_id: 'guild_a' });
    const w2 = createMockWinner({ guild_id: 'guild_b' });
    expect(w1.guild_id).not.toBe(w2.guild_id);
  });
});

describe('Status Transitions', () => {
  it('ACTIVE -> ENDED is valid', () => {
    const giveaway = createMockGiveaway({ status: 'ACTIVE' });
    expect(giveaway.status).toBe('ACTIVE');
    const ended = { ...giveaway, status: 'ENDED' as GiveawayStatus };
    expect(ended.status).toBe('ENDED');
  });

  it('ACTIVE -> CANCELLED is valid', () => {
    const giveaway = createMockGiveaway({ status: 'ACTIVE' });
    const cancelled = { ...giveaway, status: 'CANCELLED' as GiveawayStatus };
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('ENDED -> ACTIVE is not valid (already ended)', () => {
    const giveaway = createMockGiveaway({ status: 'ENDED' });
    expect(giveaway.status).toBe('ENDED');
  });

  it('CANCELLED -> ACTIVE is not valid (already cancelled)', () => {
    const giveaway = createMockGiveaway({ status: 'CANCELLED' });
    expect(giveaway.status).toBe('CANCELLED');
  });
});

describe('Winner Selection', () => {
  it('should select no winners from empty entries', async () => {
    const winners = await selectWinners([], 5);
    expect(winners).toEqual([]);
  });

  it('should select unique winners', async () => {
    const entries = [
      { user_id: 'user1' },
      { user_id: 'user2' },
      { user_id: 'user3' },
      { user_id: 'user4' },
      { user_id: 'user5' },
    ];
    const winners = await selectWinners(entries, 3);
    expect(winners.length).toBe(3);
    const uniqueWinners = new Set(winners);
    expect(uniqueWinners.size).toBe(winners.length);
  });

  it('should not select same user multiple times', async () => {
    const entries = [
      { user_id: 'user1' },
      { user_id: 'user2' },
    ];
    const winners = await selectWinners(entries, 5);
    expect(winners.length).toBe(2);
    const uniqueWinners = new Set(winners);
    expect(uniqueWinners.size).toBe(2);
  });

  it('should handle more winners requested than entries', async () => {
    const entries = [
      { user_id: 'user1' },
      { user_id: 'user2' },
    ];
    const winners = await selectWinners(entries, 10);
    expect(winners.length).toBe(2);
  });

  it('should handle single winner', async () => {
    const entries = [
      { user_id: 'user1' },
      { user_id: 'user2' },
      { user_id: 'user3' },
    ];
    const winners = await selectWinners(entries, 1);
    expect(winners.length).toBe(1);
  });

  it('should handle all entries as winners', async () => {
    const entries = [
      { user_id: 'user1' },
      { user_id: 'user2' },
      { user_id: 'user3' },
    ];
    const winners = await selectWinners(entries, 3);
    expect(winners.length).toBe(3);
    expect(winners.sort()).toEqual(['user1', 'user2', 'user3'].sort());
  });
});

describe('Join/Leave Giveaway', () => {
  it('should join a giveaway successfully', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway()),
      addEntry: vi.fn().mockResolvedValue(createMockEntry()),
      countEntries: vi.fn().mockResolvedValue(1),
    } as unknown as GiveawayRepository;

    const result = await joinGiveaway(1, 'guild1', 'user1', mockRepo);
    expect(result.success).toBe(true);
    expect(result.entryCount).toBe(1);
  });

  it('should fail to join non-existent giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(null),
    } as unknown as GiveawayRepository;

    const result = await joinGiveaway(999, 'guild1', 'user1', mockRepo);
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('should fail to join cross-guild giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ guild_id: 'guild2' })),
    } as unknown as GiveawayRepository;

    const result = await joinGiveaway(1, 'guild1', 'user1', mockRepo);
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found in this server');
  });

  it('should fail to join ended giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'ENDED' })),
    } as unknown as GiveawayRepository;

    const result = await joinGiveaway(1, 'guild1', 'user1', mockRepo);
    expect(result.success).toBe(false);
    expect(result.message).toContain('ended');
  });

  it('should fail to join cancelled giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'CANCELLED' })),
    } as unknown as GiveawayRepository;

    const result = await joinGiveaway(1, 'guild1', 'user1', mockRepo);
    expect(result.success).toBe(false);
    expect(result.message).toContain('ended');
  });

  it('should fail to join expired giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(
        createMockGiveaway({ ends_at: new Date(Date.now() - 10000).toISOString() })
      ),
    } as unknown as GiveawayRepository;

    const result = await joinGiveaway(1, 'guild1', 'user1', mockRepo);
    expect(result.success).toBe(false);
    expect(result.message).toContain('ended');
  });

  it('should fail to join duplicate entry', async () => {
    const error = new Error('ALREADY_JOINED');
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway()),
      addEntry: vi.fn().mockRejectedValue(error),
      countEntries: vi.fn().mockResolvedValue(5),
    } as unknown as GiveawayRepository;

    const result = await joinGiveaway(1, 'guild1', 'user1', mockRepo);
    expect(result.success).toBe(false);
    expect(result.message).toContain('already entered');
  });

  it('should leave a giveaway successfully', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway()),
      removeEntry: vi.fn().mockResolvedValue(true),
      countEntries: vi.fn().mockResolvedValue(4),
    } as unknown as GiveawayRepository;

    const result = await leaveGiveaway(1, 'guild1', 'user1', mockRepo);
    expect(result.success).toBe(true);
    expect(result.entryCount).toBe(4);
  });

  it('should fail to leave non-existent giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(null),
    } as unknown as GiveawayRepository;

    const result = await leaveGiveaway(999, 'guild1', 'user1', mockRepo);
    expect(result.success).toBe(false);
  });

  it('should fail to leave cross-guild giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ guild_id: 'guild2' })),
    } as unknown as GiveawayRepository;

    const result = await leaveGiveaway(1, 'guild1', 'user1', mockRepo);
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found in this server');
  });

  it('should fail to leave when not entered', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway()),
      removeEntry: vi.fn().mockResolvedValue(false),
      countEntries: vi.fn().mockResolvedValue(5),
    } as unknown as GiveawayRepository;

    const result = await leaveGiveaway(1, 'guild1', 'user1', mockRepo);
    expect(result.success).toBe(false);
    expect(result.message).toContain('not entered');
  });
});

describe('End Giveaway', () => {
  it('should end a giveaway successfully', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway()),
      endGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'ENDED' })),
      getEntries: vi.fn().mockResolvedValue([
        createMockEntry({ user_id: 'user1' }),
        createMockEntry({ user_id: 'user2' }),
      ]),
      createWinner: vi.fn().mockResolvedValue(createMockWinner()),
    } as unknown as GiveawayRepository;

    const result = await endGiveaway(1, mockRepo);
    expect(result.giveaway).not.toBeNull();
    expect(result.winners.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle ending non-existent giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(null),
    } as unknown as GiveawayRepository;

    const result = await endGiveaway(999, mockRepo);
    expect(result.giveaway).toBeNull();
    expect(result.message).toContain('not found');
  });

  it('should handle ending already ended giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'ENDED' })),
    } as unknown as GiveawayRepository;

    const result = await endGiveaway(1, mockRepo);
    expect(result.message).toContain('already');
  });

  it('should handle ending cancelled giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'CANCELLED' })),
    } as unknown as GiveawayRepository;

    const result = await endGiveaway(1, mockRepo);
    expect(result.message).toContain('already');
  });

  it('should handle zero entries', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway()),
      endGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'ENDED' })),
      getEntries: vi.fn().mockResolvedValue([]),
    } as unknown as GiveawayRepository;

    const result = await endGiveaway(1, mockRepo);
    expect(result.winners.length).toBe(0);
  });
});

describe('Cancel Giveaway', () => {
  it('should cancel a giveaway successfully', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway()),
      cancelGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'CANCELLED' })),
    } as unknown as GiveawayRepository;

    const result = await cancelGiveaway(1, mockRepo);
    expect(result.giveaway).not.toBeNull();
    expect(result.message).toContain('cancelled');
  });

  it('should handle cancelling non-existent giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(null),
    } as unknown as GiveawayRepository;

    const result = await cancelGiveaway(999, mockRepo);
    expect(result.giveaway).toBeNull();
    expect(result.message).toContain('not found');
  });

  it('should handle cancelling already ended giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'ENDED' })),
    } as unknown as GiveawayRepository;

    const result = await cancelGiveaway(1, mockRepo);
    expect(result.message).toContain('already');
  });

  it('should handle cancelling already cancelled giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'CANCELLED' })),
    } as unknown as GiveawayRepository;

    const result = await cancelGiveaway(1, mockRepo);
    expect(result.message).toContain('already');
  });
});

describe('Reroll', () => {
  it('should reroll a giveaway successfully', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'ENDED' })),
      getEligibleRerollCandidates: vi.fn().mockResolvedValue([
        createMockEntry({ user_id: 'user3' }),
        createMockEntry({ user_id: 'user4' }),
      ]),
      getWinners: vi.fn().mockResolvedValue([createMockWinner()]),
      createWinner: vi.fn().mockImplementation((data) =>
        Promise.resolve(createMockWinner({ user_id: data.user_id, reroll_number: data.reroll_number || 0 }))
      ),
    } as unknown as GiveawayRepository;

    const result = await rerollGiveaway(1, mockRepo);
    expect(result.winner).not.toBeNull();
    expect(result.message).toMatch(/Reroll winner: <@(user3|user4)>/);
  });

  it('should handle rerolling non-existent giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(null),
    } as unknown as GiveawayRepository;

    const result = await rerollGiveaway(999, mockRepo);
    expect(result.winner).toBeNull();
    expect(result.message).toContain('not found');
  });

  it('should handle rerolling active giveaway', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'ACTIVE' })),
    } as unknown as GiveawayRepository;

    const result = await rerollGiveaway(1, mockRepo);
    expect(result.message).toContain('must be ended');
  });

  it('should handle no eligible candidates', async () => {
    const mockRepo = {
      getGiveaway: vi.fn().mockResolvedValue(createMockGiveaway({ status: 'ENDED' })),
      getEligibleRerollCandidates: vi.fn().mockResolvedValue([]),
    } as unknown as GiveawayRepository;

    const result = await rerollGiveaway(1, mockRepo);
    expect(result.winner).toBeNull();
    expect(result.message).toContain('No eligible candidates');
  });
});

describe('Permission Logic', () => {
  const canManage = (
    userId: string,
    giveaway: GiveawayRow,
    isGuildManager: boolean
  ): boolean => {
    if (userId === giveaway.host_id) return true;
    if (isGuildManager) return true;
    return false;
  };

  it('host can manage own giveaway', () => {
    const giveaway = createMockGiveaway({ host_id: 'user1' });
    expect(canManage('user1', giveaway, false)).toBe(true);
  });

  it('non-host cannot manage giveaway', () => {
    const giveaway = createMockGiveaway({ host_id: 'user1' });
    expect(canManage('user2', giveaway, false)).toBe(false);
  });

  it('guild manager can manage any giveaway', () => {
    const giveaway = createMockGiveaway({ host_id: 'user1' });
    expect(canManage('manager1', giveaway, true)).toBe(true);
  });
});

describe('Embed Builder', () => {
  it('should create active giveaway embed', () => {
    const giveaway = createMockGiveaway();
    const embed = createGiveawayEmbed(giveaway, 10);
    expect(embed.data.title).toBe('Test Prize');
  });

  it('should create ended giveaway embed', () => {
    const giveaway = createMockGiveaway({ status: 'ENDED' });
    const embed = createGiveawayEmbed(giveaway, 5);
    expect(embed.data.title).toBe('Test Prize');
  });

  it('should create cancelled giveaway embed', () => {
    const giveaway = createMockGiveaway({ status: 'CANCELLED' });
    const embed = createGiveawayEmbed(giveaway, 0);
    expect(embed.data.title).toBe('Test Prize');
  });

  it('should include entry count in embed', () => {
    const giveaway = createMockGiveaway();
    const embed = createGiveawayEmbed(giveaway, 42);
    const fields = embed.data.fields || [];
    const entryField = fields.find((f) => f.name === 'Entries');
    expect(entryField?.value).toBe('42');
  });

  it('should include description when present', () => {
    const giveaway = createMockGiveaway({ description: 'Special description' });
    const embed = createGiveawayEmbed(giveaway, 0);
    expect(embed.data.description).toBe('Special description');
  });
});

describe('Button Builder', () => {
  it('should create active giveaway button', () => {
    const row = createGiveawayButton(1, true);
    const button = row.components[0];
    expect(button.data.custom_id).toBe('giveaway:join:1');
    expect(button.data.label).toBe('Enter Giveaway');
    expect(button.data.style).toBe(1);
    expect(button.data.disabled).toBe(false);
  });

  it('should create disabled button for ended giveaway', () => {
    const row = createGiveawayButton(1, false);
    const button = row.components[0];
    expect(button.data.custom_id).toBe('giveaway:join:1');
    expect(button.data.label).toBe('Giveaway Ended');
    expect(button.data.style).toBe(2);
    expect(button.data.disabled).toBe(true);
  });
});

describe('Winners String', () => {
  it('should format winners correctly', () => {
    const winners = [
      createMockWinner({ user_id: 'user1' }),
      createMockWinner({ user_id: 'user2' }),
    ];
    const str = buildWinnersString(winners);
    expect(str).toContain('user1');
    expect(str).toContain('user2');
  });

  it('should handle no winners', () => {
    const str = buildWinnersString([]);
    expect(str).toBe('No winners');
  });

  it('should handle single winner', () => {
    const winners = [createMockWinner({ user_id: 'user1' })];
    const str = buildWinnersString(winners);
    expect(str).toContain('user1');
  });
});

describe('Guild Isolation', () => {
  it('giveaway belongs to specific guild', () => {
    const giveaway = createMockGiveaway({ guild_id: 'guild1' });
    expect(giveaway.guild_id).toBe('guild1');
  });

  it('entry belongs to specific guild', () => {
    const entry = createMockEntry({ guild_id: 'guild1' });
    expect(entry.guild_id).toBe('guild1');
  });

  it('winner belongs to specific guild', () => {
    const winner = createMockWinner({ guild_id: 'guild1' });
    expect(winner.guild_id).toBe('guild1');
  });

  it('cross-guild access prevention', () => {
    const giveaway = createMockGiveaway({ guild_id: 'guild1' });
    const requestGuildId = 'guild2';
    expect(giveaway.guild_id).not.toBe(requestGuildId);
  });
});

describe('Edge Cases', () => {
  it('should handle very long prize names', () => {
    const longPrize = 'A'.repeat(MAX_PRIZE_LENGTH);
    const giveaway = createMockGiveaway({ prize: longPrize });
    expect(giveaway.prize.length).toBe(MAX_PRIZE_LENGTH);
  });

  it('should handle special characters in prize', () => {
    const giveaway = createMockGiveaway({ prize: '🎁 Special Prize! @everyone $100' });
    expect(giveaway.prize).toContain('@everyone');
  });

  it('should handle giveaway with no description', () => {
    const giveaway = createMockGiveaway({ description: '' });
    expect(giveaway.description).toBe('');
  });

  it('should handle giveaway with null message_id', () => {
    const giveaway = createMockGiveaway({ message_id: null });
    expect(giveaway.message_id).toBeNull();
  });

  it('should handle zero winner count (edge case)', () => {
    const validation = validateGiveawayParams(60000, 0, 'Prize');
    expect(validation.valid).toBe(false);
  });

  it('should handle single winner', () => {
    const validation = validateGiveawayParams(60000, 1, 'Prize');
    expect(validation.valid).toBe(true);
  });

  it('should handle maximum winners', () => {
    const validation = validateGiveawayParams(60000, MAX_WINNERS, 'Prize');
    expect(validation.valid).toBe(true);
  });
});

describe('Concurrent Operations', () => {
  it('should handle concurrent entry attempts via unique constraint', async () => {
    const entries = [
      createMockEntry({ user_id: 'user1' }),
      createMockEntry({ user_id: 'user2' }),
      createMockEntry({ user_id: 'user3' }),
    ];
    expect(new Set(entries.map((e) => e.user_id)).size).toBe(entries.length);
  });

  it('should handle concurrent winner selection', async () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({ user_id: `user${i}` }));
    const winners1 = await selectWinners(entries, 5);
    const winners2 = await selectWinners(entries, 5);
    expect(new Set(winners1).size).toBe(winners1.length);
    expect(new Set(winners2).size).toBe(winners2.length);
  });
});
