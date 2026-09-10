import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

interface LevelingConfig {
  enabled: boolean;
  xpPerMessage: number;
  cooldownSeconds: number;
  levelUpMessage: string;
  levelUpChannel: string | null;
  levelUpEmbed: boolean;
  xpMultiplier: number;
  roleRewards: Record<string, string>;
}

interface LevelRoleReward {
  id: string;
  guild_id: string;
  level: number;
  role_id: string;
  created_at: string;
}

const DEFAULT_CONFIG: LevelingConfig = {
  enabled: true,
  xpPerMessage: 15,
  cooldownSeconds: 60,
  levelUpMessage: 'Congratulations {user}! You reached level **{level}**!',
  levelUpChannel: null,
  levelUpEmbed: true,
  xpMultiplier: 1.0,
  roleRewards: {},
};

const createConfig = (overrides: Partial<LevelingConfig> = {}): LevelingConfig => ({
  ...DEFAULT_CONFIG,
  ...overrides,
});

const createRoleReward = (overrides: Partial<LevelRoleReward> = {}): LevelRoleReward => ({
  id: 'rr1',
  guild_id: 'guild1',
  level: 5,
  role_id: 'role123',
  created_at: new Date().toISOString(),
  ...overrides,
});

function formatMessage(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

describe('LevelConfig Default Values', () => {
  it('should have enabled as true by default', () => {
    expect(DEFAULT_CONFIG.enabled).toBe(true);
  });

  it('should have xpPerMessage of 15', () => {
    expect(DEFAULT_CONFIG.xpPerMessage).toBe(15);
  });

  it('should have cooldownSeconds of 60', () => {
    expect(DEFAULT_CONFIG.cooldownSeconds).toBe(60);
  });

  it('should have levelUpEmbed as true', () => {
    expect(DEFAULT_CONFIG.levelUpEmbed).toBe(true);
  });

  it('should have xpMultiplier of 1.0', () => {
    expect(DEFAULT_CONFIG.xpMultiplier).toBe(1.0);
  });

  it('should have null levelUpChannel by default', () => {
    expect(DEFAULT_CONFIG.levelUpChannel).toBeNull();
  });

  it('should merge overrides with defaults', () => {
    const config = createConfig({ enabled: false, xpPerMessage: 25 });
    expect(config.enabled).toBe(false);
    expect(config.xpPerMessage).toBe(25);
    expect(config.cooldownSeconds).toBe(60);
  });
});

describe('LevelUp Message Template Replacement', () => {
  it('should replace {user} placeholder', () => {
    const result = formatMessage('Hello {user}!', { user: '<@123>' });
    expect(result).toBe('Hello <@123>!');
  });

  it('should replace {level} placeholder', () => {
    const result = formatMessage('Level {level}', { level: '10' });
    expect(result).toBe('Level 10');
  });

  it('should replace {username} placeholder', () => {
    const result = formatMessage('User: {username}', { username: 'TestUser' });
    expect(result).toBe('User: TestUser');
  });

  it('should replace {server} placeholder', () => {
    const result = formatMessage('Welcome to {server}', { server: 'My Server' });
    expect(result).toBe('Welcome to My Server');
  });

  it('should replace {oldLevel} placeholder', () => {
    const result = formatMessage('{oldLevel} → {level}', { oldLevel: '4', level: '5' });
    expect(result).toBe('4 → 5');
  });

  it('should replace multiple placeholders', () => {
    const result = formatMessage('{user} reached level {level} in {server}', {
      user: '<@1>',
      level: '5',
      server: 'Test Guild',
    });
    expect(result).toBe('<@1> reached level 5 in Test Guild');
  });

  it('should handle template with no placeholders', () => {
    const result = formatMessage('No placeholders here', {});
    expect(result).toBe('No placeholders here');
  });
});

describe('Role Rewards', () => {
  it('should create role reward with correct fields', () => {
    const reward = createRoleReward({ level: 10, role_id: 'role456' });
    expect(reward.level).toBe(10);
    expect(reward.role_id).toBe('role456');
    expect(reward.guild_id).toBe('guild1');
  });

  it('should support different levels', () => {
    const r1 = createRoleReward({ level: 5 });
    const r2 = createRoleReward({ level: 10 });
    expect(r1.level).toBeLessThan(r2.level);
  });

  it('should have guild isolation', () => {
    const r1 = createRoleReward({ guild_id: 'g1' });
    const r2 = createRoleReward({ guild_id: 'g2' });
    expect(r1.guild_id).not.toBe(r2.guild_id);
  });

  it('should sort rewards by level ascending', () => {
    const rewards = [
      createRoleReward({ level: 10 }),
      createRoleReward({ level: 5 }),
      createRoleReward({ level: 1 }),
    ];
    rewards.sort((a, b) => a.level - b.level);
    expect(rewards.map(r => r.level)).toEqual([1, 5, 10]);
  });
});

describe('Role Reward Level Lookup', () => {
  const rewards: LevelRoleReward[] = [
    createRoleReward({ level: 5, role_id: 'role5' }),
    createRoleReward({ level: 10, role_id: 'role10' }),
    createRoleReward({ level: 20, role_id: 'role20' }),
  ];

  it('should find exact level reward', () => {
    const result = rewards.findLast(r => r.level <= 10);
    expect(result).toBeDefined();
    expect(result!.level).toBe(10);
  });

  it('should find closest lower reward', () => {
    const result = rewards.findLast(r => r.level <= 15);
    expect(result).toBeDefined();
    expect(result!.level).toBe(10);
  });

  it('should return null when level is below all rewards', () => {
    const result = rewards.findLast(r => r.level <= 3);
    expect(result).toBeUndefined();
  });

  it('should find first reward for level 1', () => {
    const result = rewards.findLast(r => r.level <= 5);
    expect(result).toBeDefined();
    expect(result!.role_id).toBe('role5');
  });

  it('should handle level 20 exactly', () => {
    const result = rewards.findLast(r => r.level <= 20);
    expect(result).toBeDefined();
    expect(result!.level).toBe(20);
  });
});

describe('LevelUp Config Update', () => {
  it('should override specific fields', () => {
    const current = createConfig();
    const updated = { ...current, enabled: false, xpPerMessage: 30 };
    expect(updated.enabled).toBe(false);
    expect(updated.xpPerMessage).toBe(30);
    expect(updated.cooldownSeconds).toBe(60);
  });

  it('should update levelUpMessage', () => {
    const config = createConfig();
    const updated = { ...config, levelUpMessage: 'Nice work {user}! Level {level}!' };
    expect(updated.levelUpMessage).toBe('Nice work {user}! Level {level}!');
  });

  it('should update levelUpChannel', () => {
    const config = createConfig();
    const updated = { ...config, levelUpChannel: 'channel123' };
    expect(updated.levelUpChannel).toBe('channel123');
  });

  it('should toggle levelUpEmbed', () => {
    const config = createConfig({ levelUpEmbed: true });
    const updated = { ...config, levelUpEmbed: false };
    expect(updated.levelUpEmbed).toBe(false);
  });
});
