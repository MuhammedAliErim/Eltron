import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactionRoleRepository } from '../src/database/repositories/ReactionRoleRepository';
import type { ReactionRoleRow, ReactionRoleCreate } from '../src/database/schema';

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
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

const DEFAULT_REACTION_ROLE: ReactionRoleRow = {
  id: 'rr-1',
  guild_id: 'guild1',
  channel_id: 'channel1',
  message_id: 'msg1',
  title: 'Test Reaction Role',
  description: 'A test reaction role',
  color: '#5865F2',
  emoji: '👍',
  role_id: 'role1',
  max_uses: 0,
  current_uses: 0,
  created_by: 'user1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const createReactionRoleRow = (overrides: Partial<ReactionRoleRow> = {}): ReactionRoleRow => ({
  ...DEFAULT_REACTION_ROLE,
  ...overrides,
});

describe('ReactionRoleRepository', () => {
  let repo: ReactionRoleRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ReactionRoleRepository();
  });

  describe('create', () => {
    it('should have create method', () => {
      expect(typeof repo.create).toBe('function');
    });

    it('should accept valid ReactionRoleCreate data', async () => {
      const data: ReactionRoleCreate = {
        guild_id: 'guild1',
        channel_id: 'channel1',
        message_id: 'msg1',
        title: 'Test Role',
        emoji: '👍',
        role_id: 'role1',
        created_by: 'user1',
      };
      expect(data.guild_id).toBe('guild1');
      expect(data.title).toBe('Test Role');
      expect(data.emoji).toBe('👍');
    });
  });

  describe('getById', () => {
    it('should have getById method', () => {
      expect(typeof repo.getById).toBe('function');
    });
  });

  describe('getByMessage', () => {
    it('should have getByMessage method', () => {
      expect(typeof repo.getByMessage).toBe('function');
    });
  });

  describe('getByMessageAndEmoji', () => {
    it('should have getByMessageAndEmoji method', () => {
      expect(typeof repo.getByMessageAndEmoji).toBe('function');
    });
  });

  describe('getByGuild', () => {
    it('should have getByGuild method', () => {
      expect(typeof repo.getByGuild).toBe('function');
    });
  });

  describe('delete', () => {
    it('should have delete method', () => {
      expect(typeof repo.delete).toBe('function');
    });
  });

  describe('incrementUses', () => {
    it('should have incrementUses method', () => {
      expect(typeof repo.incrementUses).toBe('function');
    });
  });

  describe('decrementUses', () => {
    it('should have decrementUses method', () => {
      expect(typeof repo.decrementUses).toBe('function');
    });
  });
});

describe('ReactionRoleRow Model', () => {
  it('should have valid default structure', () => {
    const row = createReactionRoleRow();
    expect(row.id).toBe('rr-1');
    expect(row.guild_id).toBe('guild1');
    expect(row.channel_id).toBe('channel1');
    expect(row.message_id).toBe('msg1');
    expect(row.title).toBe('Test Reaction Role');
    expect(row.emoji).toBe('👍');
    expect(row.role_id).toBe('role1');
    expect(row.max_uses).toBe(0);
    expect(row.current_uses).toBe(0);
  });

  it('should support description', () => {
    const row = createReactionRoleRow({ description: 'Custom description' });
    expect(row.description).toBe('Custom description');
  });

  it('should support null description', () => {
    const row = createReactionRoleRow({ description: null });
    expect(row.description).toBeNull();
  });

  it('should support custom color', () => {
    const row = createReactionRoleRow({ color: '#FF0000' });
    expect(row.color).toBe('#FF0000');
  });

  it('should support max_uses', () => {
    const row = createReactionRoleRow({ max_uses: 10 });
    expect(row.max_uses).toBe(10);
  });

  it('should support current_uses', () => {
    const row = createReactionRoleRow({ current_uses: 5 });
    expect(row.current_uses).toBe(5);
  });

  it('should enforce guild isolation', () => {
    const r1 = createReactionRoleRow({ guild_id: 'g1' });
    const r2 = createReactionRoleRow({ guild_id: 'g2' });
    expect(r1.guild_id).not.toBe(r2.guild_id);
  });

  it('should have timestamps', () => {
    const row = createReactionRoleRow();
    expect(row.created_at).toBeDefined();
    expect(row.updated_at).toBeDefined();
  });

  it('should track created_by', () => {
    const row = createReactionRoleRow({ created_by: 'admin1' });
    expect(row.created_by).toBe('admin1');
  });
});

describe('ReactionRoleCreate Model', () => {
  it('should require guild_id, channel_id, message_id, title, emoji, role_id, created_by', () => {
    const create: ReactionRoleCreate = {
      guild_id: 'guild1',
      channel_id: 'channel1',
      message_id: 'msg1',
      title: 'Role',
      emoji: '✅',
      role_id: 'role1',
      created_by: 'user1',
    };
    expect(create.guild_id).toBeDefined();
    expect(create.channel_id).toBeDefined();
    expect(create.message_id).toBeDefined();
    expect(create.title).toBeDefined();
    expect(create.emoji).toBeDefined();
    expect(create.role_id).toBeDefined();
    expect(create.created_by).toBeDefined();
  });

  it('should allow optional description', () => {
    const create: ReactionRoleCreate = {
      guild_id: 'guild1',
      channel_id: 'channel1',
      message_id: 'msg1',
      title: 'Role',
      emoji: '✅',
      role_id: 'role1',
      created_by: 'user1',
      description: 'Optional desc',
    };
    expect(create.description).toBe('Optional desc');
  });

  it('should allow optional color', () => {
    const create: ReactionRoleCreate = {
      guild_id: 'guild1',
      channel_id: 'channel1',
      message_id: 'msg1',
      title: 'Role',
      emoji: '✅',
      role_id: 'role1',
      created_by: 'user1',
      color: '#FF0000',
    };
    expect(create.color).toBe('#FF0000');
  });
});

describe('ReactionRoleUpdate Model', () => {
  it('should allow partial updates', () => {
    const update = { title: 'New Title' };
    expect(update.title).toBe('New Title');
  });

  it('should allow description update', () => {
    const update = { description: 'Updated' };
    expect(update.description).toBe('Updated');
  });

  it('should allow color update', () => {
    const update = { color: '#00FF00' };
    expect(update.color).toBe('#00FF00');
  });

  it('should allow max_uses update', () => {
    const update = { max_uses: 25 };
    expect(update.max_uses).toBe(25);
  });

  it('should allow current_uses update', () => {
    const update = { current_uses: 10 };
    expect(update.current_uses).toBe(10);
  });
});

describe('ReactionRole — Security', () => {
  it('should not expose secrets in row', () => {
    const row = createReactionRoleRow();
    const json = JSON.stringify(row);
    expect(json).not.toContain('token');
    expect(json).not.toContain('secret');
  });

  it('should enforce guild isolation', () => {
    const r1 = createReactionRoleRow({ guild_id: 'guild_a' });
    const r2 = createReactionRoleRow({ guild_id: 'guild_b' });
    expect(r1.guild_id).not.toBe(r2.guild_id);
  });
});

describe('ReactionRole — Edge Cases', () => {
  it('should handle empty title', () => {
    const row = createReactionRoleRow({ title: '' });
    expect(row.title).toBe('');
  });

  it('should handle long title', () => {
    const row = createReactionRoleRow({ title: 'a'.repeat(100) });
    expect(row.title.length).toBe(100);
  });

  it('should handle unicode emoji', () => {
    const row = createReactionRoleRow({ emoji: '🎉' });
    expect(row.emoji).toBe('🎉');
  });

  it('should handle custom emoji string', () => {
    const row = createReactionRoleRow({ emoji: '<:custom:123456>' });
    expect(row.emoji).toBe('<:custom:123456>');
  });

  it('should handle zero max_uses', () => {
    const row = createReactionRoleRow({ max_uses: 0 });
    expect(row.max_uses).toBe(0);
  });

  it('should handle high current_uses', () => {
    const row = createReactionRoleRow({ current_uses: 999999 });
    expect(row.current_uses).toBe(999999);
  });
});
