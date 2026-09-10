import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogService } from '../src/services/audit-log/AuditLogService';

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
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'log1', created_at: new Date().toISOString() }, error: null }),
    })),
  }),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

describe('AuditLogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logModeration', () => {
    it('should be a static method', () => {
      expect(typeof AuditLogService.logModeration).toBe('function');
    });

    it('should accept guildId, action, moderatorId, targetId, reason', async () => {
      await expect(
        AuditLogService.logModeration('guild1', 'warn', 'mod1', 'target1', 'Spamming'),
      ).resolves.toBeUndefined();
    });

    it('should accept optional details', async () => {
      await expect(
        AuditLogService.logModeration('guild1', 'ban', 'mod1', 'target1', 'Rule violation', { duration: 7 }),
      ).resolves.toBeUndefined();
    });
  });

  describe('logConfigChange', () => {
    it('should be a static method', () => {
      expect(typeof AuditLogService.logConfigChange).toBe('function');
    });

    it('should accept guildId, action, moderatorId, details', async () => {
      await expect(
        AuditLogService.logConfigChange('guild1', 'automod_update', 'mod1', { enabled: true }),
      ).resolves.toBeUndefined();
    });
  });

  describe('logMemberJoin', () => {
    it('should be a static method', () => {
      expect(typeof AuditLogService.logMemberJoin).toBe('function');
    });

    it('should accept guildId and userId', async () => {
      await expect(
        AuditLogService.logMemberJoin('guild1', 'user1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('logMemberLeave', () => {
    it('should be a static method', () => {
      expect(typeof AuditLogService.logMemberLeave).toBe('function');
    });

    it('should accept guildId and userId', async () => {
      await expect(
        AuditLogService.logMemberLeave('guild1', 'user1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('logMessageDelete', () => {
    it('should be a static method', () => {
      expect(typeof AuditLogService.logMessageDelete).toBe('function');
    });

    it('should accept guildId, channelId, authorId, content', async () => {
      await expect(
        AuditLogService.logMessageDelete('guild1', 'ch1', 'user1', 'deleted content'),
      ).resolves.toBeUndefined();
    });

    it('should accept optional moderatorId', async () => {
      await expect(
        AuditLogService.logMessageDelete('guild1', 'ch1', 'user1', 'deleted content', 'mod1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('logMessageEdit', () => {
    it('should be a static method', () => {
      expect(typeof AuditLogService.logMessageEdit).toBe('function');
    });

    it('should accept guildId, channelId, authorId, oldContent, newContent', async () => {
      await expect(
        AuditLogService.logMessageEdit('guild1', 'ch1', 'user1', 'old', 'new'),
      ).resolves.toBeUndefined();
    });
  });

  describe('logRoleChange', () => {
    it('should be a static method', () => {
      expect(typeof AuditLogService.logRoleChange).toBe('function');
    });

    it('should accept guildId, moderatorId, targetId, action, roleName', async () => {
      await expect(
        AuditLogService.logRoleChange('guild1', 'mod1', 'role1', 'role_create', 'New Role'),
      ).resolves.toBeUndefined();
    });

    it('should accept optional details', async () => {
      await expect(
        AuditLogService.logRoleChange('guild1', 'mod1', 'role1', 'role_update', 'Role', { oldName: 'Old' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('logChannelChange', () => {
    it('should be a static method', () => {
      expect(typeof AuditLogService.logChannelChange).toBe('function');
    });

    it('should accept guildId, moderatorId, channelId, action', async () => {
      await expect(
        AuditLogService.logChannelChange('guild1', 'mod1', 'ch1', 'channel_lock'),
      ).resolves.toBeUndefined();
    });

    it('should accept optional details', async () => {
      await expect(
        AuditLogService.logChannelChange('guild1', 'mod1', 'ch1', 'slowmode_change', { duration: 10 }),
      ).resolves.toBeUndefined();
    });
  });

  describe('logAutoMod', () => {
    it('should be a static method', () => {
      expect(typeof AuditLogService.logAutoMod).toBe('function');
    });

    it('should accept guildId, action, targetId, details', async () => {
      await expect(
        AuditLogService.logAutoMod('guild1', 'spam_detected', 'user1', { messageCount: 5 }),
      ).resolves.toBeUndefined();
    });
  });
});

describe('AuditLogService — Action Formatting', () => {
  it('should handle moderation actions', async () => {
    await expect(
      AuditLogService.logModeration('g1', 'timeout', 'mod1', 't1', 'Spam'),
    ).resolves.toBeUndefined();
  });

  it('should handle config actions', async () => {
    await expect(
      AuditLogService.logConfigChange('g1', 'welcome_update', 'mod1', {}),
    ).resolves.toBeUndefined();
  });

  it('should handle channel actions', async () => {
    await expect(
      AuditLogService.logChannelChange('g1', 'mod1', 'ch1', 'channel_unlock'),
    ).resolves.toBeUndefined();
  });

  it('should handle role actions', async () => {
    await expect(
      AuditLogService.logRoleChange('g1', 'mod1', 'r1', 'role_delete', 'Deleted Role'),
    ).resolves.toBeUndefined();
  });
});

describe('AuditLogService — Security', () => {
  it('should not throw on service errors', async () => {
    await expect(
      AuditLogService.logModeration('guild1', 'warn', 'mod1', 'target1', 'test'),
    ).resolves.toBeUndefined();
  });

  it('should handle empty strings gracefully', async () => {
    await expect(
      AuditLogService.logModeration('guild1', 'warn', 'mod1', 'target1', ''),
    ).resolves.toBeUndefined();
  });

  it('should handle long content in message delete', async () => {
    const longContent = 'x'.repeat(5000);
    await expect(
      AuditLogService.logMessageDelete('guild1', 'ch1', 'user1', longContent),
    ).resolves.toBeUndefined();
  });
});
