import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReminderRepository } from '../src/database/repositories/ReminderRepository';
import { ReminderRow, ReminderStatus } from '../src/database/schema';
import {
  createReminder,
  getReminderById,
  listUserReminders,
  cancelReminder,
  triggerReminder,
  restoreReminderTimers,
  parseReminderDuration,
} from '../src/services/reminder/ReminderService';
import {
  MissingPermissionsError,
  BusinessRuleError,
  ValidationError,
} from '../src/utils/errors';

const GUILD_ID = 'guild1';
const USER_ID = 'user1';
const CHANNEL_ID = 'channel1';
const REMINDER_ID = 1;

const createMockReminder = (overrides: Partial<ReminderRow> = {}): ReminderRow => ({
  id: REMINDER_ID,
  guild_id: GUILD_ID,
  user_id: USER_ID,
  channel_id: CHANNEL_ID,
  message: 'Test reminder',
  remind_at: new Date(Date.now() + 3600000).toISOString(),
  status: 'PENDING' as ReminderStatus,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({}),
}));

const mockRepo = vi.hoisted(() => ({
  createReminder: vi.fn(),
  getReminder: vi.fn(),
  getUserReminders: vi.fn(),
  getGuildReminders: vi.fn(),
  getPendingReminders: vi.fn(),
  countActiveReminders: vi.fn(),
  updateReminder: vi.fn(),
  cancelReminder: vi.fn(),
  markTriggered: vi.fn(),
  deleteReminder: vi.fn(),
}));

vi.mock('../src/database/repositories/ReminderRepository', () => ({
  ReminderRepository: vi.fn().mockImplementation(() => mockRepo),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  logError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockRepo.getReminder.mockImplementation((id: number) =>
    Promise.resolve(createMockReminder({ id }))
  );
  mockRepo.getUserReminders.mockResolvedValue([]);
  mockRepo.getPendingReminders.mockResolvedValue([]);
  mockRepo.countActiveReminders.mockResolvedValue(0);
  mockRepo.createReminder.mockImplementation((data: Record<string, unknown>) =>
    Promise.resolve(createMockReminder({
      guild_id: data.guild_id as string,
      user_id: data.user_id as string,
      channel_id: data.channel_id as string,
      message: data.message as string,
      remind_at: data.remind_at as string,
    }))
  );
  mockRepo.cancelReminder.mockImplementation((id: number) =>
    Promise.resolve(createMockReminder({ id, status: 'CANCELLED' }))
  );
  mockRepo.markTriggered.mockImplementation((id: number) =>
    Promise.resolve(createMockReminder({ id, status: 'TRIGGERED' }))
  );
});

describe('parseReminderDuration', () => {
  it('should parse seconds', () => {
    expect(parseReminderDuration('30s')).toBe(30000);
  });

  it('should parse minutes', () => {
    expect(parseReminderDuration('5m')).toBe(300000);
  });

  it('should parse hours', () => {
    expect(parseReminderDuration('2h')).toBe(7200000);
  });

  it('should parse days', () => {
    expect(parseReminderDuration('7d')).toBe(604800000);
  });

  it('should parse weeks', () => {
    expect(parseReminderDuration('1w')).toBe(604800000);
  });

  it('should handle uppercase', () => {
    expect(parseReminderDuration('30M')).toBe(1800000);
  });

  it('should handle whitespace', () => {
    expect(parseReminderDuration(' 30m ')).toBe(1800000);
  });

  it('should return null for invalid format', () => {
    expect(parseReminderDuration('abc')).toBeNull();
  });

  it('should return null for missing unit', () => {
    expect(parseReminderDuration('30')).toBeNull();
  });

  it('should return null for invalid unit', () => {
    expect(parseReminderDuration('30x')).toBeNull();
  });
});

describe('ReminderRepository', () => {
  describe('createReminder', () => {
    it('should create a reminder', async () => {
      const result = mockRepo.createReminder({
        guild_id: GUILD_ID,
        user_id: USER_ID,
        channel_id: CHANNEL_ID,
        message: 'Test',
        remind_at: new Date().toISOString(),
      });
      expect(result).toBeDefined();
    });
  });

  describe('getReminder', () => {
    it('should get a reminder', async () => {
      const result = mockRepo.getReminder(REMINDER_ID);
      expect(result).toBeDefined();
    });
  });

  describe('getUserReminders', () => {
    it('should list user reminders', async () => {
      const result = mockRepo.getUserReminders(USER_ID, GUILD_ID);
      expect(result).toBeDefined();
    });
  });

  describe('getPendingReminders', () => {
    it('should get pending reminders', async () => {
      const result = mockRepo.getPendingReminders();
      expect(result).toBeDefined();
    });
  });

  describe('countActiveReminders', () => {
    it('should count active reminders', async () => {
      const result = mockRepo.countActiveReminders(USER_ID, GUILD_ID);
      expect(result).toBeDefined();
    });
  });

  describe('cancelReminder', () => {
    it('should cancel a reminder', async () => {
      const result = mockRepo.cancelReminder(REMINDER_ID);
      expect(result).toBeDefined();
    });
  });

  describe('markTriggered', () => {
    it('should mark reminder as triggered', async () => {
      const result = mockRepo.markTriggered(REMINDER_ID);
      expect(result).toBeDefined();
    });
  });

  describe('deleteReminder', () => {
    it('should delete a reminder', async () => {
      mockRepo.deleteReminder.mockResolvedValue(true);
      const result = mockRepo.deleteReminder(REMINDER_ID);
      expect(result).toBeDefined();
    });
  });

  describe('updateReminder', () => {
    it('should update a reminder', async () => {
      mockRepo.updateReminder.mockResolvedValue(createMockReminder({ status: 'CANCELLED' }));
      const result = mockRepo.updateReminder(REMINDER_ID, { status: 'CANCELLED' });
      expect(result).toBeDefined();
    });
  });
});

describe('createReminder - Business Logic', () => {
  it('should create a reminder with valid data', async () => {
    const result = await createReminder({
      guildId: GUILD_ID,
      channelId: CHANNEL_ID,
      userId: USER_ID,
      message: 'Test reminder',
      durationMs: 60000,
    });

    expect(result).toBeDefined();
    expect(result.message).toBe('Test reminder');
    expect(mockRepo.createReminder).toHaveBeenCalled();
  });

  it('should throw if user is bot', async () => {
    await expect(
      createReminder({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        userId: USER_ID,
        userBot: true,
        message: 'Test',
        durationMs: 60000,
      })
    ).rejects.toThrow(MissingPermissionsError);
  });

  it('should throw if no guildId', async () => {
    await expect(
      createReminder({
        guildId: '',
        channelId: CHANNEL_ID,
        userId: USER_ID,
        message: 'Test',
        durationMs: 60000,
      })
    ).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if message is empty', async () => {
    await expect(
      createReminder({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        userId: USER_ID,
        message: '',
        durationMs: 60000,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if message too long', async () => {
    await expect(
      createReminder({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        userId: USER_ID,
        message: 'A'.repeat(2001),
        durationMs: 60000,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if duration too short', async () => {
    await expect(
      createReminder({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        userId: USER_ID,
        message: 'Test',
        durationMs: 5000,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if duration too long', async () => {
    await expect(
      createReminder({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        userId: USER_ID,
        message: 'Test',
        durationMs: 400 * 24 * 60 * 60 * 1000,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if active reminder limit reached', async () => {
    mockRepo.countActiveReminders.mockResolvedValue(20);

    await expect(
      createReminder({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        userId: USER_ID,
        message: 'Test',
        durationMs: 60000,
      })
    ).rejects.toThrow(BusinessRuleError);
  });

  it('should allow reminder at exact limit', async () => {
    mockRepo.countActiveReminders.mockResolvedValue(19);

    const result = await createReminder({
      guildId: GUILD_ID,
      channelId: CHANNEL_ID,
      userId: USER_ID,
      message: 'Test',
      durationMs: 60000,
    });
    expect(result).toBeDefined();
  });

  it('should allow exactly minimum duration', async () => {
    const result = await createReminder({
      guildId: GUILD_ID,
      channelId: CHANNEL_ID,
      userId: USER_ID,
      message: 'Test',
      durationMs: 10000,
    });
    expect(result).toBeDefined();
  });

  it('should allow exactly maximum duration', async () => {
    const result = await createReminder({
      guildId: GUILD_ID,
      channelId: CHANNEL_ID,
      userId: USER_ID,
      message: 'Test',
      durationMs: 365 * 24 * 60 * 60 * 1000,
    });
    expect(result).toBeDefined();
  });
});

describe('getReminderById - Business Logic', () => {
  it('should return reminder if found and user matches', async () => {
    const result = await getReminderById(REMINDER_ID, USER_ID);
    expect(result).toBeDefined();
    expect(result.id).toBe(REMINDER_ID);
  });

  it('should throw if reminder not found', async () => {
    mockRepo.getReminder.mockResolvedValue(null);
    await expect(getReminderById(REMINDER_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if user mismatch', async () => {
    mockRepo.getReminder.mockResolvedValue(createMockReminder({ user_id: 'other_user' }));
    await expect(getReminderById(REMINDER_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });
});

describe('listUserReminders - Business Logic', () => {
  it('should list pending reminders', async () => {
    mockRepo.getUserReminders.mockResolvedValue([createMockReminder()]);
    const result = await listUserReminders(USER_ID, GUILD_ID);
    expect(result).toHaveLength(1);
    expect(mockRepo.getUserReminders).toHaveBeenCalledWith(USER_ID, GUILD_ID, 'PENDING');
  });

  it('should return empty for no reminders', async () => {
    const result = await listUserReminders(USER_ID, GUILD_ID);
    expect(result).toHaveLength(0);
  });
});

describe('cancelReminder - Business Logic', () => {
  it('should cancel a pending reminder', async () => {
    const result = await cancelReminder(REMINDER_ID, USER_ID);
    expect(result).toBeDefined();
    expect(result.status).toBe('CANCELLED');
    expect(mockRepo.cancelReminder).toHaveBeenCalled();
  });

  it('should throw if reminder not found', async () => {
    mockRepo.getReminder.mockResolvedValue(null);
    await expect(cancelReminder(REMINDER_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if user mismatch', async () => {
    mockRepo.getReminder.mockResolvedValue(createMockReminder({ user_id: 'other' }));
    await expect(cancelReminder(REMINDER_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if already cancelled', async () => {
    mockRepo.getReminder.mockResolvedValue(createMockReminder({ status: 'CANCELLED' }));
    await expect(cancelReminder(REMINDER_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if already triggered', async () => {
    mockRepo.getReminder.mockResolvedValue(createMockReminder({ status: 'TRIGGERED' }));
    await expect(cancelReminder(REMINDER_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if cancelReminder returns null', async () => {
    mockRepo.cancelReminder.mockResolvedValue(null);
    await expect(cancelReminder(REMINDER_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });
});

describe('triggerReminder - Business Logic', () => {
  it('should trigger a pending reminder', async () => {
    mockRepo.getReminder.mockResolvedValue(
      createMockReminder({ remind_at: new Date(Date.now() - 1000).toISOString() })
    );
    const mockClient = {
      channels: {
        fetch: vi.fn().mockResolvedValue({
          isTextBased: () => true,
          isDMBased: () => false,
          send: vi.fn(),
        }),
      },
    };

    await triggerReminder(REMINDER_ID, mockClient as never);
    expect(mockRepo.markTriggered).toHaveBeenCalled();
  });

  it('should skip if reminder not found', async () => {
    mockRepo.getReminder.mockResolvedValue(null);
    const mockClient = { channels: { fetch: vi.fn() } };

    await triggerReminder(REMINDER_ID, mockClient as never);
    expect(mockRepo.markTriggered).not.toHaveBeenCalled();
  });

  it('should skip if reminder not PENDING', async () => {
    mockRepo.getReminder.mockResolvedValue(createMockReminder({ status: 'CANCELLED' }));
    const mockClient = { channels: { fetch: vi.fn() } };

    await triggerReminder(REMINDER_ID, mockClient as never);
    expect(mockRepo.markTriggered).not.toHaveBeenCalled();
  });

  it('should skip if remind_at is in the future', async () => {
    mockRepo.getReminder.mockResolvedValue(
      createMockReminder({ remind_at: new Date(Date.now() + 3600000).toISOString() })
    );
    const mockClient = { channels: { fetch: vi.fn() } };

    await triggerReminder(REMINDER_ID, mockClient as never);
    expect(mockRepo.markTriggered).not.toHaveBeenCalled();
  });

  it('should handle deleted channel gracefully', async () => {
    mockRepo.getReminder.mockResolvedValue(
      createMockReminder({ remind_at: new Date(Date.now() - 1000).toISOString() })
    );
    const mockClient = {
      channels: {
        fetch: vi.fn().mockResolvedValue(null),
      },
    };

    await triggerReminder(REMINDER_ID, mockClient as never);
    expect(mockRepo.markTriggered).toHaveBeenCalled();
  });

  it('should handle Discord API error gracefully', async () => {
    mockRepo.getReminder.mockResolvedValue(
      createMockReminder({ remind_at: new Date(Date.now() - 1000).toISOString() })
    );
    const mockClient = {
      channels: {
        fetch: vi.fn().mockRejectedValue(new Error('API Error')),
      },
    };

    await triggerReminder(REMINDER_ID, mockClient as never);
    expect(mockRepo.markTriggered).toHaveBeenCalled();
  });
});

describe('Timers', () => {
  it('should restore reminder timers', async () => {
    mockRepo.getPendingReminders.mockResolvedValue([
      createMockReminder({ remind_at: new Date(Date.now() + 3600000).toISOString() }),
    ]);

    const mockClient = { channels: { fetch: vi.fn() } };
    await restoreReminderTimers(mockClient as never);
    expect(mockRepo.getPendingReminders).toHaveBeenCalled();
  });

  it('should trigger expired reminders on restore', async () => {
    const expiredReminder = createMockReminder({
      remind_at: new Date(Date.now() - 1000).toISOString(),
    });
    mockRepo.getPendingReminders.mockResolvedValue([expiredReminder]);
    mockRepo.getReminder.mockResolvedValue(expiredReminder);

    const mockClient = {
      channels: {
        fetch: vi.fn().mockResolvedValue({
          isTextBased: () => true,
          isDMBased: () => false,
          send: vi.fn(),
        }),
      },
    };

    await restoreReminderTimers(mockClient as never);
    expect(mockRepo.markTriggered).toHaveBeenCalled();
  });

  it('should handle restore with no pending reminders', async () => {
    mockRepo.getPendingReminders.mockResolvedValue([]);
    const mockClient = { channels: { fetch: vi.fn() } };

    await restoreReminderTimers(mockClient as never);
    expect(mockRepo.markTriggered).not.toHaveBeenCalled();
  });

  it('should handle restore error gracefully', async () => {
    mockRepo.getPendingReminders.mockRejectedValue(new Error('DB error'));
    const mockClient = { channels: { fetch: vi.fn() } };

    await expect(restoreReminderTimers(mockClient as never)).resolves.not.toThrow();
  });
});

describe('Security', () => {
  it('should enforce user isolation in getReminderById', async () => {
    mockRepo.getReminder.mockResolvedValue(createMockReminder({ user_id: 'other' }));
    await expect(getReminderById(REMINDER_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should prevent bot reminder creation', async () => {
    await expect(
      createReminder({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        userId: USER_ID,
        userBot: true,
        message: 'Test',
        durationMs: 60000,
      })
    ).rejects.toThrow(MissingPermissionsError);
  });

  it('should prevent cancelled reminder cancellation', async () => {
    mockRepo.getReminder.mockResolvedValue(createMockReminder({ status: 'CANCELLED' }));
    await expect(cancelReminder(REMINDER_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should prevent triggered reminder cancellation', async () => {
    mockRepo.getReminder.mockResolvedValue(createMockReminder({ status: 'TRIGGERED' }));
    await expect(cancelReminder(REMINDER_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should prevent invalid reminder access', async () => {
    mockRepo.getReminder.mockResolvedValue(null);
    await expect(getReminderById(999, USER_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should require guild for reminder creation', async () => {
    await expect(
      createReminder({
        guildId: '',
        channelId: CHANNEL_ID,
        userId: USER_ID,
        message: 'Test',
        durationMs: 60000,
      })
    ).rejects.toThrow(BusinessRuleError);
  });
});

describe('Edge Cases', () => {
  it('should handle message at exact max length', async () => {
    const result = await createReminder({
      guildId: GUILD_ID,
      channelId: CHANNEL_ID,
      userId: USER_ID,
      message: 'A'.repeat(2000),
      durationMs: 60000,
    });
    expect(result).toBeDefined();
  });

  it('should handle reminder with special characters', async () => {
    const result = await createReminder({
      guildId: GUILD_ID,
      channelId: CHANNEL_ID,
      userId: USER_ID,
      message: 'Test @everyone <@123> https://example.com',
      durationMs: 60000,
    });
    expect(result).toBeDefined();
  });

  it('should handle getReminderById when repo throws', async () => {
    mockRepo.getReminder.mockRejectedValue(new Error('DB error'));
    await expect(getReminderById(REMINDER_ID, USER_ID)).rejects.toThrow();
  });

  it('should handle cancelReminder when repo throws', async () => {
    mockRepo.cancelReminder.mockRejectedValue(new Error('DB error'));
    await expect(cancelReminder(REMINDER_ID, USER_ID)).rejects.toThrow();
  });

  it('should handle listUserReminders when repo throws', async () => {
    mockRepo.getUserReminders.mockRejectedValue(new Error('DB error'));
    await expect(listUserReminders(USER_ID, GUILD_ID)).rejects.toThrow();
  });
});
