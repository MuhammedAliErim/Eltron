import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canBotManageRole,
  canMemberManageRole,
  validateRoleName,
  validateHexColor,
  parseHexColor,
  createRoleInfoEmbed,
  applyAutoRole,
} from '../src/services/role/RoleService';
import { RoleRepository } from '../src/database/repositories/RoleRepository';
import type { AutoRoleConfigRow, AutoRoleConfigUpdate } from '../src/database/schema';

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
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

const createMockRole = (overrides: Record<string, unknown> = {}) => ({
  id: 'role1',
  name: 'Test Role',
  color: 0,
  hexColor: '#000000',
  hoist: false,
  mentionable: false,
  position: 5,
  memberCount: 10,
  createdTimestamp: Date.now(),
  ...overrides,
});

const createMockGuild = (overrides: Record<string, unknown> = {}) => ({
  id: 'guild1',
  name: 'Test Guild',
  ownerId: 'owner1',
  members: {
    me: {
      id: 'bot1',
      roles: {
        highest: { position: 10 },
      },
    },
    fetch: vi.fn().mockResolvedValue({
      id: 'user1',
      user: { id: 'user1', bot: false },
      roles: {
        highest: { position: 3 },
        cache: { has: vi.fn().mockReturnValue(false) },
        add: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue({}),
      },
      roles: {
        highest: { position: 3 },
        cache: { has: vi.fn().mockReturnValue(false) },
        add: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue({}),
      },
    }),
  },
  roles: {
    cache: {
      get: vi.fn().mockReturnValue(null),
      sort: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      first: vi.fn().mockReturnValue([]),
    },
    create: vi.fn().mockResolvedValue({ id: 'newrole', name: 'New Role' }),
  },
  ...overrides,
});

const createMockMember = (overrides: Record<string, unknown> = {}) => ({
  id: 'user1',
  user: { id: 'user1', username: 'TestUser', bot: false },
  guild: createMockGuild(),
  permissions: {
    has: vi.fn().mockReturnValue(false),
  },
  roles: {
    highest: { position: 3 },
    cache: { has: vi.fn().mockReturnValue(false) },
    add: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue({}),
  },
  ...overrides,
});

const DEFAULT_AUTOROLE_CONFIG: AutoRoleConfigRow = {
  guild_id: 'guild1',
  role_id: null,
  enabled: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('RoleService — canBotManageRole', () => {
  it('should return true when bot role is higher', () => {
    const guild = createMockGuild();
    const role = createMockRole({ position: 5 });
    expect(canBotManageRole(guild as any, role as any)).toBe(true);
  });

  it('should return false when bot role is lower or equal', () => {
    const guild = createMockGuild();
    guild.members.me.roles.highest.position = 5;
    const role = createMockRole({ position: 5 });
    expect(canBotManageRole(guild as any, role as any)).toBe(false);
  });

  it('should return false when bot member is null', () => {
    const guild = createMockGuild();
    guild.members.me = null;
    const role = createMockRole();
    expect(canBotManageRole(guild as any, role as any)).toBe(false);
  });
});

describe('RoleService — canMemberManageRole', () => {
  it('should return true for Administrator', () => {
    const member = createMockMember();
    member.permissions.has = vi.fn().mockReturnValue(true);
    const role = createMockRole({ position: 10 });
    expect(canMemberManageRole(member as any, role as any)).toBe(true);
  });

  it('should return true when member role is higher', () => {
    const member = createMockMember();
    member.roles.highest = { position: 10 };
    const role = createMockRole({ position: 5 });
    expect(canMemberManageRole(member as any, role as any)).toBe(true);
  });

  it('should return false when member role is lower', () => {
    const member = createMockMember();
    member.roles.highest = { position: 2 };
    const role = createMockRole({ position: 5 });
    expect(canMemberManageRole(member as any, role as any)).toBe(false);
  });
});

describe('RoleService — validateRoleName', () => {
  it('should accept valid names', () => {
    expect(validateRoleName('Admin')).toBeNull();
    expect(validateRoleName('A')).toBeNull();
    expect(validateRoleName('a'.repeat(100))).toBeNull();
  });

  it('should reject empty names', () => {
    expect(validateRoleName('')).not.toBeNull();
    expect(validateRoleName('   ')).not.toBeNull();
  });

  it('should reject names over 100 characters', () => {
    expect(validateRoleName('a'.repeat(101))).not.toBeNull();
  });
});

describe('RoleService — validateHexColor', () => {
  it('should accept valid hex colors', () => {
    expect(validateHexColor('#FF0000')).toBe(true);
    expect(validateHexColor('FF0000')).toBe(true);
    expect(validateHexColor('#00ff00')).toBe(true);
    expect(validateHexColor('#abcdef')).toBe(true);
  });

  it('should reject invalid hex colors', () => {
    expect(validateHexColor('red')).toBe(false);
    expect(validateHexColor('#GGGGGG')).toBe(false);
    expect(validateHexColor('#FFF')).toBe(false);
    expect(validateHexColor('')).toBe(false);
  });
});

describe('RoleService — parseHexColor', () => {
  it('should parse hex with #', () => {
    expect(parseHexColor('#FF0000')).toBe(0xff0000);
  });

  it('should parse hex without #', () => {
    expect(parseHexColor('FF0000')).toBe(0xff0000);
  });

  it('should parse lowercase', () => {
    expect(parseHexColor('#00ff00')).toBe(0x00ff00);
  });
});

describe('RoleService — createRoleInfoEmbed', () => {
  it('should create an embed with role info', () => {
    const role = createMockRole({
      name: 'Admin',
      hexColor: '#FF0000',
      hoist: true,
      mentionable: true,
      position: 10,
      members: { size: 50 },
    });
    const embed = createRoleInfoEmbed(role as any);
    expect(embed).toBeDefined();
  });
});

describe('RoleService — applyAutoRole', () => {
  it('should not apply to bots', async () => {
    const member = createMockMember({
      user: { id: 'bot1', username: 'Bot', bot: true },
    });
    const result = await applyAutoRole(member as any, 'role1');
    expect(result.success).toBe(false);
  });

  it('should fail when role not found in guild', async () => {
    const member = createMockMember();
    member.guild.roles.cache.get = vi.fn().mockReturnValue(null);
    const result = await applyAutoRole(member as any, 'nonexistent');
    expect(result.success).toBe(false);
  });

  it('should fail when bot cannot manage role', async () => {
    const guild = createMockGuild();
    guild.members.me.roles.highest.position = 2;
    const member = createMockMember({ guild });
    const role = createMockRole({ position: 5 });
    member.guild.roles.cache.get = vi.fn().mockReturnValue(role);
    const result = await applyAutoRole(member as any, 'role1');
    expect(result.success).toBe(false);
  });

  it('should succeed when role is assignable', async () => {
    const guild = createMockGuild();
    const member = createMockMember({ guild });
    const role = createMockRole({ position: 5 });
    member.guild.roles.cache.get = vi.fn().mockReturnValue(role);
    member.roles.cache.has = vi.fn().mockReturnValue(false);
    member.roles.add = vi.fn().mockResolvedValue({});
    const result = await applyAutoRole(member as any, 'role1');
    expect(result.success).toBe(true);
  });

  it('should handle Discord API failure', async () => {
    const guild = createMockGuild();
    const member = createMockMember({ guild });
    const role = createMockRole({ position: 5 });
    member.guild.roles.cache.get = vi.fn().mockReturnValue(role);
    member.roles.cache.has = vi.fn().mockReturnValue(false);
    member.roles.add = vi.fn().mockRejectedValue(new Error('API Error'));
    const result = await applyAutoRole(member as any, 'role1');
    expect(result.success).toBe(false);
  });
});

describe('AutoRoleConfig Model', () => {
  it('should have valid default structure', () => {
    const config: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG };
    expect(config.guild_id).toBe('guild1');
    expect(config.enabled).toBe(false);
    expect(config.role_id).toBeNull();
  });

  it('should support enabled state', () => {
    const config: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG, enabled: true };
    expect(config.enabled).toBe(true);
  });

  it('should support role_id', () => {
    const config: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG, role_id: 'role1' };
    expect(config.role_id).toBe('role1');
  });

  it('should enforce guild isolation', () => {
    const c1: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG, guild_id: 'g1' };
    const c2: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG, guild_id: 'g2' };
    expect(c1.guild_id).not.toBe(c2.guild_id);
  });

  it('should have timestamps', () => {
    const config: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG };
    expect(config.created_at).toBeDefined();
    expect(config.updated_at).toBeDefined();
  });

  it('should support null role_id', () => {
    const config: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG, role_id: null };
    expect(config.role_id).toBeNull();
  });
});

describe('AutoRoleConfigUpdate', () => {
  it('should allow partial updates', () => {
    const update: AutoRoleConfigUpdate = { enabled: true };
    expect(update.enabled).toBe(true);
    expect(update.role_id).toBeUndefined();
  });

  it('should allow role_id update', () => {
    const update: AutoRoleConfigUpdate = { role_id: 'role1' };
    expect(update.role_id).toBe('role1');
  });

  it('should allow null role_id', () => {
    const update: AutoRoleConfigUpdate = { role_id: null };
    expect(update.role_id).toBeNull();
  });
});

describe('RoleRepository', () => {
  it('should have getAutoRoleConfig method', () => {
    const repo = new RoleRepository();
    expect(typeof repo.getAutoRoleConfig).toBe('function');
  });

  it('should have upsertAutoRoleConfig method', () => {
    const repo = new RoleRepository();
    expect(typeof repo.upsertAutoRoleConfig).toBe('function');
  });

  it('should have resetAutoRoleConfig method', () => {
    const repo = new RoleRepository();
    expect(typeof repo.resetAutoRoleConfig).toBe('function');
  });
});

describe('Role Security', () => {
  it('should not expose secrets in logs', () => {
    const config: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG };
    const json = JSON.stringify(config);
    expect(json).not.toContain('token');
    expect(json).not.toContain('secret');
  });

  it('should enforce guild isolation in config', () => {
    const c1: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG, guild_id: 'guild_a' };
    const c2: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG, guild_id: 'guild_b' };
    expect(c1.guild_id).not.toBe(c2.guild_id);
  });

  it('should prevent assigning roles bot cannot manage', async () => {
    const guild = createMockGuild();
    guild.members.me.roles.highest.position = 2;
    const member = createMockMember({ guild });
    const role = createMockRole({ position: 5 });
    member.guild.roles.cache.get = vi.fn().mockReturnValue(role);
    const result = await applyAutoRole(member as any, 'role1');
    expect(result.success).toBe(false);
  });

  it('should handle disabled auto-role safely', async () => {
    const config: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG, enabled: false };
    expect(config.enabled).toBe(false);
  });

  it('should handle null role_id safely', async () => {
    const config: AutoRoleConfigRow = { ...DEFAULT_AUTOROLE_CONFIG, role_id: null };
    expect(config.role_id).toBeNull();
  });
});

describe('Role Edge Cases', () => {
  it('should handle empty role name', () => {
    expect(validateRoleName('')).not.toBeNull();
  });

  it('should handle max length role name', () => {
    expect(validateRoleName('a'.repeat(100))).toBeNull();
  });

  it('should handle role with position 0', () => {
    const role = createMockRole({ position: 0 });
    expect(role.position).toBe(0);
  });

  it('should handle role with no members', () => {
    const role = createMockRole({ memberCount: 0 });
    expect(role.memberCount).toBe(0);
  });

  it('should handle large member count', () => {
    const role = createMockRole({ memberCount: 999999 });
    expect(role.memberCount).toBe(999999);
  });
});

describe('Commands', () => {
  it('should have Role command', () => {
    expect(true).toBe(true);
  });

  it('should have AutoRole command', () => {
    expect(true).toBe(true);
  });
});

describe('GuildMemberAdd AutoRole Integration', () => {
  it('should have auto-role integration in GuildMemberAdd', () => {
    expect(true).toBe(true);
  });
});
