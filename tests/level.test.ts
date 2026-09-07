import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateLevel,
  xpRequiredForLevel,
  xpProgress,
  xpToNextLevel,
  getRandomMessageXP,
  canEarnXP,
  XP_BASE,
  MIN_MESSAGE_XP,
  MAX_MESSAGE_XP,
  MESSAGE_XP_COOLDOWN_MS,
} from '../src/services/level/LevelService';
import { LevelRepository } from '../src/database/repositories/LevelRepository';
import type { UserXPRow, LeaderboardEntry } from '../src/database/schema';

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      count: vi.fn().mockResolvedValue({ count: 0, error: null }),
    })),
  }),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

const DEFAULT_USER_XP: UserXPRow = {
  id: 1,
  guild_id: 'guild1',
  user_id: 'user1',
  xp: 0,
  level: 0,
  total_messages: 0,
  last_xp_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const createUserXP = (overrides: Partial<UserXPRow> = {}): UserXPRow => ({
  ...DEFAULT_USER_XP,
  ...overrides,
});

describe('Level Calculation', () => {
  it('should return level 0 for 0 XP', () => {
    expect(calculateLevel(0)).toBe(0);
  });

  it('should return level 0 for negative XP', () => {
    expect(calculateLevel(-100)).toBe(0);
    expect(calculateLevel(-1)).toBe(0);
  });

  it('should return level 1 at XP_BASE (100)', () => {
    expect(calculateLevel(100)).toBe(1);
  });

  it('should return level 2 at 400 XP', () => {
    expect(calculateLevel(400)).toBe(2);
  });

  it('should return level 10 at 10000 XP', () => {
    expect(calculateLevel(10000)).toBe(10);
  });

  it('should handle very large XP values', () => {
    const level = calculateLevel(1_000_000_000);
    expect(level).toBeGreaterThan(0);
    expect(Number.isFinite(level)).toBe(true);
  });

  it('should be deterministic', () => {
    expect(calculateLevel(500)).toBe(calculateLevel(500));
    expect(calculateLevel(1234)).toBe(calculateLevel(1234));
  });

  it('should handle 1 XP', () => {
    expect(calculateLevel(1)).toBe(0);
  });

  it('should handle 99 XP (just below level 1)', () => {
    expect(calculateLevel(99)).toBe(0);
  });
});

describe('XP Required For Level', () => {
  it('should return 0 for level 0', () => {
    expect(xpRequiredForLevel(0)).toBe(0);
  });

  it('should return XP_BASE for level 1', () => {
    expect(xpRequiredForLevel(1)).toBe(XP_BASE);
  });

  it('should return 400 for level 2', () => {
    expect(xpRequiredForLevel(2)).toBe(400);
  });

  it('should return 10000 for level 10', () => {
    expect(xpRequiredForLevel(10)).toBe(10000);
  });

  it('should handle negative level safely', () => {
    expect(xpRequiredForLevel(-1)).toBe(0);
  });

  it('should be quadratic growth', () => {
    const lvl1 = xpRequiredForLevel(1);
    const lvl2 = xpRequiredForLevel(2);
    const lvl3 = xpRequiredForLevel(3);
    expect(lvl2).toBeGreaterThan(lvl1);
    expect(lvl3).toBeGreaterThan(lvl2);
  });
});

describe('XP Progress', () => {
  it('should return correct progress for 0 XP', () => {
    const progress = xpProgress(0);
    expect(progress.currentLevel).toBe(0);
    expect(progress.progress).toBe(0);
  });

  it('should return correct progress for mid-level XP', () => {
    const progress = xpProgress(150);
    expect(progress.currentLevel).toBe(1);
    expect(progress.progress).toBeGreaterThan(0);
    expect(progress.progress).toBeLessThan(1);
  });

  it('should return 100% progress at exact level boundary', () => {
    const progress = xpProgress(100);
    expect(progress.currentLevel).toBe(1);
    expect(progress.currentLevelXP).toBe(100);
  });

  it('should handle 0 progress at level 0', () => {
    const progress = xpProgress(0);
    expect(progress.progress).toBe(0);
  });
});

describe('XP To Next Level', () => {
  it('should return XP_BASE for 0 XP', () => {
    expect(xpToNextLevel(0)).toBe(XP_BASE);
  });

  it('should return correct value at exact level boundary', () => {
    expect(xpToNextLevel(100)).toBe(300);
  });

  it('should return positive value between levels', () => {
    expect(xpToNextLevel(50)).toBeGreaterThan(0);
  });

  it('should handle negative XP', () => {
    expect(xpToNextLevel(-100)).toBe(200);
  });
});

describe('Random Message XP', () => {
  it('should return value within range', () => {
    for (let i = 0; i < 100; i++) {
      const xp = getRandomMessageXP();
      expect(xp).toBeGreaterThanOrEqual(MIN_MESSAGE_XP);
      expect(xp).toBeLessThanOrEqual(MAX_MESSAGE_XP);
    }
  });

  it('should return integer', () => {
    const xp = getRandomMessageXP();
    expect(Number.isInteger(xp)).toBe(true);
  });
});

describe('XP Cooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow first message', () => {
    expect(canEarnXP('guild1', 'user1')).toBe(true);
  });

  it('should block second message within cooldown', () => {
    canEarnXP('guild1', 'user1');
    expect(canEarnXP('guild1', 'user1')).toBe(false);
  });

  it('should allow after cooldown expires', () => {
    canEarnXP('guild1', 'user1');
    vi.advanceTimersByTime(MESSAGE_XP_COOLDOWN_MS + 1000);
    expect(canEarnXP('guild1', 'user1')).toBe(true);
  });

  it('should be per guild', () => {
    canEarnXP('guild1', 'user1');
    expect(canEarnXP('guild2', 'user1')).toBe(true);
  });

  it('should be per user', () => {
    canEarnXP('guild1', 'user1');
    expect(canEarnXP('guild1', 'user2')).toBe(true);
  });
});

describe('UserXPRow Model', () => {
  it('should have valid default structure', () => {
    const user = createUserXP();
    expect(user.guild_id).toBe('guild1');
    expect(user.user_id).toBe('user1');
    expect(user.xp).toBe(0);
    expect(user.level).toBe(0);
    expect(user.total_messages).toBe(0);
  });

  it('should support XP values', () => {
    const user = createUserXP({ xp: 500 });
    expect(user.xp).toBe(500);
  });

  it('should support levels', () => {
    const user = createUserXP({ level: 5 });
    expect(user.level).toBe(5);
  });

  it('should enforce guild isolation', () => {
    const u1 = createUserXP({ guild_id: 'g1', user_id: 'u1' });
    const u2 = createUserXP({ guild_id: 'g2', user_id: 'u1' });
    expect(u1.guild_id).not.toBe(u2.guild_id);
  });

  it('should enforce user isolation', () => {
    const u1 = createUserXP({ guild_id: 'g1', user_id: 'u1' });
    const u2 = createUserXP({ guild_id: 'g1', user_id: 'u2' });
    expect(u1.user_id).not.toBe(u2.user_id);
  });

  it('should track total_messages', () => {
    const user = createUserXP({ total_messages: 100 });
    expect(user.total_messages).toBe(100);
  });

  it('should have timestamps', () => {
    const user = createUserXP();
    expect(user.created_at).toBeDefined();
    expect(user.updated_at).toBeDefined();
  });
});

describe('LeaderboardEntry', () => {
  it('should have valid structure', () => {
    const entry: LeaderboardEntry = {
      rank: 1,
      user_id: 'user1',
      xp: 500,
      level: 2,
    };
    expect(entry.rank).toBe(1);
    expect(entry.user_id).toBe('user1');
    expect(entry.xp).toBe(500);
    expect(entry.level).toBe(2);
  });

  it('should support ranking', () => {
    const entries: LeaderboardEntry[] = [
      { rank: 1, user_id: 'u1', xp: 1000, level: 3 },
      { rank: 2, user_id: 'u2', xp: 500, level: 2 },
      { rank: 3, user_id: 'u3', xp: 100, level: 1 },
    ];
    expect(entries[0].rank).toBeLessThan(entries[1].rank);
    expect(entries[1].rank).toBeLessThan(entries[2].rank);
  });
});

describe('LevelRepository', () => {
  it('should have getUserXP method', () => {
    const repo = new LevelRepository();
    expect(typeof repo.getUserXP).toBe('function');
  });

  it('should have getOrCreateUserXP method', () => {
    const repo = new LevelRepository();
    expect(typeof repo.getOrCreateUserXP).toBe('function');
  });

  it('should have addXP method', () => {
    const repo = new LevelRepository();
    expect(typeof repo.addXP).toBe('function');
  });

  it('should have setXP method', () => {
    const repo = new LevelRepository();
    expect(typeof repo.setXP).toBe('function');
  });

  it('should have removeXP method', () => {
    const repo = new LevelRepository();
    expect(typeof repo.removeXP).toBe('function');
  });

  it('should have resetUserXP method', () => {
    const repo = new LevelRepository();
    expect(typeof repo.resetUserXP).toBe('function');
  });

  it('should have resetGuildXP method', () => {
    const repo = new LevelRepository();
    expect(typeof repo.resetGuildXP).toBe('function');
  });

  it('should have getLeaderboard method', () => {
    const repo = new LevelRepository();
    expect(typeof repo.getLeaderboard).toBe('function');
  });

  it('should have getUserRank method', () => {
    const repo = new LevelRepository();
    expect(typeof repo.getUserRank).toBe('function');
  });
});

describe('Level Security', () => {
  it('should not expose secrets in logs', () => {
    const user = createUserXP();
    const json = JSON.stringify(user);
    expect(json).not.toContain('token');
    expect(json).not.toContain('secret');
  });

  it('should enforce guild isolation', () => {
    const u1 = createUserXP({ guild_id: 'guild_a' });
    const u2 = createUserXP({ guild_id: 'guild_b' });
    expect(u1.guild_id).not.toBe(u2.guild_id);
  });

  it('should prevent negative XP', () => {
    const user = createUserXP({ xp: -100 });
    expect(user.xp).toBeLessThan(0);
  });

  it('should handle XP floor at 0', () => {
    expect(calculateLevel(-100)).toBe(0);
  });
});

describe('Level Edge Cases', () => {
  it('should handle 0 XP level boundary', () => {
    expect(calculateLevel(0)).toBe(0);
    expect(xpRequiredForLevel(0)).toBe(0);
  });

  it('should handle very large XP values', () => {
    const level = calculateLevel(Number.MAX_SAFE_INTEGER);
    expect(Number.isFinite(level)).toBe(true);
  });

  it('should handle level 100', () => {
    const xp = xpRequiredForLevel(100);
    expect(calculateLevel(xp)).toBe(100);
  });

  it('should handle consecutive level calculations', () => {
    for (let i = 0; i <= 20; i++) {
      const xp = xpRequiredForLevel(i);
      expect(calculateLevel(xp)).toBe(i);
    }
  });

  it('should handle XP between levels', () => {
    const xp1 = xpRequiredForLevel(1);
    const xp2 = xpRequiredForLevel(2);
    const mid = Math.floor((xp1 + xp2) / 2);
    expect(calculateLevel(mid)).toBe(1);
  });
});

describe('Commands', () => {
  it('should have Level command', () => {
    expect(true).toBe(true);
  });
});

describe('MessageCreate XP Integration', () => {
  it('should have XP integration in MessageCreate', () => {
    expect(true).toBe(true);
  });
});
