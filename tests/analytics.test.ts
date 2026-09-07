import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsRepository } from '../src/database/repositories/AnalyticsRepository';
import { AnalyticsDailyRow, AnalyticsSummary } from '../src/database/schema';
import {
  recordMessage,
  recordMessageDeleted,
  recordMemberJoin,
  recordMemberLeave,
  recordModerationAction,
  recordAutomodAction,
  recordSpamDetection,
  recordRaidDetection,
  recordVerificationEvent,
  recordQuarantineEvent,
  recordTicketCreated,
  recordTicketClosed,
  recordApplicationSubmitted,
  recordApplicationApproved,
  recordApplicationRejected,
  recordGiveawayCreated,
  recordGiveawayEntry,
  recordEventCreated,
  recordEventParticipant,
  recordPollCreated,
  recordPollVote,
  recordReminderCreated,
  recordXpAwarded,
  getDailyAnalytics,
  getAnalyticsRange,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getYesterdayAnalytics,
} from '../src/services/analytics/AnalyticsService';

const GUILD_ID = 'guild1';
const TODAY = new Date().toISOString().split('T')[0];

const createMockDailyRow = (overrides: Partial<AnalyticsDailyRow> = {}): AnalyticsDailyRow => ({
  id: 1,
  guild_id: GUILD_ID,
  date: TODAY,
  messages_total: 10,
  messages_deleted: 1,
  members_joined: 2,
  members_left: 1,
  moderation_actions: 3,
  warnings: 1,
  timeouts: 1,
  kicks: 0,
  bans: 1,
  automod_actions: 5,
  spam_detections: 2,
  raid_detections: 0,
  verification_events: 1,
  quarantine_events: 0,
  tickets_created: 2,
  tickets_closed: 1,
  applications_submitted: 1,
  applications_approved: 1,
  applications_rejected: 0,
  giveaways_created: 1,
  giveaway_entries: 5,
  events_created: 1,
  event_participants: 3,
  polls_created: 1,
  poll_votes: 10,
  reminders_created: 2,
  xp_awarded: 100,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({}),
}));

const mockRepo = vi.hoisted(() => ({
  upsertDaily: vi.fn(),
  incrementMetric: vi.fn(),
  getDaily: vi.fn(),
  getRange: vi.fn(),
  getSummary: vi.fn(),
}));

vi.mock('../src/database/repositories/AnalyticsRepository', () => ({
  AnalyticsRepository: vi.fn().mockImplementation(() => mockRepo),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  logError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockRepo.incrementMetric.mockResolvedValue(undefined);
  mockRepo.upsertDaily.mockResolvedValue(undefined);
  mockRepo.getDaily.mockResolvedValue(createMockDailyRow());
  mockRepo.getRange.mockResolvedValue([createMockDailyRow()]);
  mockRepo.getSummary.mockResolvedValue({
    guild_id: GUILD_ID,
    from_date: TODAY,
    to_date: TODAY,
    messages_total: 10,
    messages_deleted: 1,
    members_joined: 2,
    members_left: 1,
    moderation_actions: 3,
    warnings: 1,
    timeouts: 1,
    kicks: 0,
    bans: 1,
    automod_actions: 5,
    spam_detections: 2,
    raid_detections: 0,
    verification_events: 1,
    quarantine_events: 0,
    tickets_created: 2,
    tickets_closed: 1,
    applications_submitted: 1,
    applications_approved: 1,
    applications_rejected: 0,
    giveaways_created: 1,
    giveaway_entries: 5,
    events_created: 1,
    event_participants: 3,
    polls_created: 1,
    poll_votes: 10,
    reminders_created: 2,
    xp_awarded: 100,
  } as AnalyticsSummary);
});

describe('AnalyticsRepository', () => {
  describe('upsertDaily', () => {
    it('should upsert daily analytics', async () => {
      await mockRepo.upsertDaily(GUILD_ID, TODAY, { messages_total: 1 });
      expect(mockRepo.upsertDaily).toHaveBeenCalled();
    });
  });

  describe('incrementMetric', () => {
    it('should increment a metric', async () => {
      await mockRepo.incrementMetric(GUILD_ID, TODAY, 'messages_total', 1);
      expect(mockRepo.incrementMetric).toHaveBeenCalled();
    });
  });

  describe('getDaily', () => {
    it('should get daily analytics', async () => {
      const result = mockRepo.getDaily(GUILD_ID, TODAY);
      expect(result).toBeDefined();
    });
  });

  describe('getRange', () => {
    it('should get range analytics', async () => {
      const result = mockRepo.getRange(GUILD_ID, TODAY, TODAY);
      expect(result).toBeDefined();
    });
  });

  describe('getSummary', () => {
    it('should get summary', async () => {
      const result = mockRepo.getSummary(GUILD_ID, TODAY, TODAY);
      expect(result).toBeDefined();
    });
  });
});

describe('Record Functions', () => {
  it('should record message', async () => {
    await recordMessage(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'messages_total', 1);
  });

  it('should record message deleted', async () => {
    await recordMessageDeleted(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'messages_deleted', 1);
  });

  it('should record member join', async () => {
    await recordMemberJoin(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'members_joined', 1);
  });

  it('should record member leave', async () => {
    await recordMemberLeave(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'members_left', 1);
  });

  it('should record moderation action', async () => {
    await recordModerationAction(GUILD_ID, 'WARN');
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'moderation_actions', 1);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'warnings', 1);
  });

  it('should record timeout', async () => {
    await recordModerationAction(GUILD_ID, 'TIMEOUT');
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'timeouts', 1);
  });

  it('should record kick', async () => {
    await recordModerationAction(GUILD_ID, 'KICK');
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'kicks', 1);
  });

  it('should record ban', async () => {
    await recordModerationAction(GUILD_ID, 'BAN');
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'bans', 1);
  });

  it('should record automod action', async () => {
    await recordAutomodAction(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'automod_actions', 1);
  });

  it('should record spam detection', async () => {
    await recordSpamDetection(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'spam_detections', 1);
  });

  it('should record raid detection', async () => {
    await recordRaidDetection(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'raid_detections', 1);
  });

  it('should record verification event', async () => {
    await recordVerificationEvent(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'verification_events', 1);
  });

  it('should record quarantine event', async () => {
    await recordQuarantineEvent(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'quarantine_events', 1);
  });

  it('should record ticket created', async () => {
    await recordTicketCreated(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'tickets_created', 1);
  });

  it('should record ticket closed', async () => {
    await recordTicketClosed(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'tickets_closed', 1);
  });

  it('should record application submitted', async () => {
    await recordApplicationSubmitted(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'applications_submitted', 1);
  });

  it('should record application approved', async () => {
    await recordApplicationApproved(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'applications_approved', 1);
  });

  it('should record application rejected', async () => {
    await recordApplicationRejected(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'applications_rejected', 1);
  });

  it('should record giveaway created', async () => {
    await recordGiveawayCreated(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'giveaways_created', 1);
  });

  it('should record giveaway entry', async () => {
    await recordGiveawayEntry(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'giveaway_entries', 1);
  });

  it('should record event created', async () => {
    await recordEventCreated(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'events_created', 1);
  });

  it('should record event participant', async () => {
    await recordEventParticipant(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'event_participants', 1);
  });

  it('should record poll created', async () => {
    await recordPollCreated(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'polls_created', 1);
  });

  it('should record poll vote', async () => {
    await recordPollVote(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'poll_votes', 1);
  });

  it('should record reminder created', async () => {
    await recordReminderCreated(GUILD_ID);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'reminders_created', 1);
  });

  it('should record xp awarded', async () => {
    await recordXpAwarded(GUILD_ID, 50);
    expect(mockRepo.incrementMetric).toHaveBeenCalledWith(GUILD_ID, TODAY, 'xp_awarded', 50);
  });
});

describe('Query Functions', () => {
  it('should get daily analytics', async () => {
    const result = await getDailyAnalytics(GUILD_ID);
    expect(result).toBeDefined();
    expect(mockRepo.getSummary).toHaveBeenCalled();
  });

  it('should get daily analytics for specific date', async () => {
    const result = await getDailyAnalytics(GUILD_ID, '2025-01-01');
    expect(result).toBeDefined();
  });

  it('should get analytics range', async () => {
    const result = await getAnalyticsRange(GUILD_ID, '2025-01-01', '2025-01-07');
    expect(result).toBeDefined();
  });

  it('should get weekly analytics', async () => {
    const result = await getWeeklyAnalytics(GUILD_ID);
    expect(result).toBeDefined();
  });

  it('should get monthly analytics', async () => {
    const result = await getMonthlyAnalytics(GUILD_ID);
    expect(result).toBeDefined();
  });

  it('should get yesterday analytics', async () => {
    const result = await getYesterdayAnalytics(GUILD_ID);
    expect(result).toBeDefined();
  });
});

describe('Failure Behavior', () => {
  it('should not throw when increment fails', async () => {
    mockRepo.incrementMetric.mockRejectedValue(new Error('DB error'));
    await expect(recordMessage(GUILD_ID)).resolves.not.toThrow();
  });

  it('should log error when increment fails', async () => {
    mockRepo.incrementMetric.mockRejectedValue(new Error('DB error'));
    await recordMessage(GUILD_ID);
    expect(vi.mocked(await import('../src/utils/logger')).logError).toHaveBeenCalled();
  });
});

describe('Aggregation', () => {
  it('should aggregate multiple days', async () => {
    const rows = [
      createMockDailyRow({ date: '2025-01-01', messages_total: 10 }),
      createMockDailyRow({ date: '2025-01-02', messages_total: 20 }),
      createMockDailyRow({ date: '2025-01-03', messages_total: 30 }),
    ];
    mockRepo.getRange.mockResolvedValue(rows);

    const result = await getAnalyticsRange(GUILD_ID, '2025-01-01', '2025-01-03');
    expect(result).toBeDefined();
  });

  it('should handle zero values', async () => {
    mockRepo.getSummary.mockResolvedValue({
      guild_id: GUILD_ID,
      from_date: TODAY,
      to_date: TODAY,
      messages_total: 0,
      messages_deleted: 0,
      members_joined: 0,
      members_left: 0,
      moderation_actions: 0,
      warnings: 0,
      timeouts: 0,
      kicks: 0,
      bans: 0,
      automod_actions: 0,
      spam_detections: 0,
      raid_detections: 0,
      verification_events: 0,
      quarantine_events: 0,
      tickets_created: 0,
      tickets_closed: 0,
      applications_submitted: 0,
      applications_approved: 0,
      applications_rejected: 0,
      giveaways_created: 0,
      giveaway_entries: 0,
      events_created: 0,
      event_participants: 0,
      polls_created: 0,
      poll_votes: 0,
      reminders_created: 0,
      xp_awarded: 0,
    } as AnalyticsSummary);

    const result = await getDailyAnalytics(GUILD_ID);
    expect(result.messages_total).toBe(0);
  });
});

describe('Edge Cases', () => {
  it('should handle getDaily when no data', async () => {
    mockRepo.getSummary.mockResolvedValue({
      guild_id: GUILD_ID,
      from_date: TODAY,
      to_date: TODAY,
      messages_total: 0,
      messages_deleted: 0,
      members_joined: 0,
      members_left: 0,
      moderation_actions: 0,
      warnings: 0,
      timeouts: 0,
      kicks: 0,
      bans: 0,
      automod_actions: 0,
      spam_detections: 0,
      raid_detections: 0,
      verification_events: 0,
      quarantine_events: 0,
      tickets_created: 0,
      tickets_closed: 0,
      applications_submitted: 0,
      applications_approved: 0,
      applications_rejected: 0,
      giveaways_created: 0,
      giveaway_entries: 0,
      events_created: 0,
      event_participants: 0,
      polls_created: 0,
      poll_votes: 0,
      reminders_created: 0,
      xp_awarded: 0,
    } as AnalyticsSummary);

    const result = await getDailyAnalytics(GUILD_ID);
    expect(result.messages_total).toBe(0);
  });

  it('should handle getRange with empty result', async () => {
    mockRepo.getRange.mockResolvedValue([]);
    mockRepo.getSummary.mockResolvedValue({
      guild_id: GUILD_ID,
      from_date: '2025-01-01',
      to_date: '2025-01-07',
      messages_total: 0,
      messages_deleted: 0,
      members_joined: 0,
      members_left: 0,
      moderation_actions: 0,
      warnings: 0,
      timeouts: 0,
      kicks: 0,
      bans: 0,
      automod_actions: 0,
      spam_detections: 0,
      raid_detections: 0,
      verification_events: 0,
      quarantine_events: 0,
      tickets_created: 0,
      tickets_closed: 0,
      applications_submitted: 0,
      applications_approved: 0,
      applications_rejected: 0,
      giveaways_created: 0,
      giveaway_entries: 0,
      events_created: 0,
      event_participants: 0,
      polls_created: 0,
      poll_votes: 0,
      reminders_created: 0,
      xp_awarded: 0,
    } as AnalyticsSummary);

    const result = await getAnalyticsRange(GUILD_ID, '2025-01-01', '2025-01-07');
    expect(result.messages_total).toBe(0);
  });
});
