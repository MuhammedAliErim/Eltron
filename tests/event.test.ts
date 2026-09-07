import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventRepository } from '../src/database/repositories/EventRepository';
import {
  EventRow,
  EventParticipantRow,
  EventWinnerRow,
  EventStatus,
  EventType,
} from '../src/database/schema';
import {
  createEvent,
  getEventById,
  listEventsByGuild,
  startEvent,
  endEvent,
  cancelEvent,
  joinEvent,
  leaveEvent,
  getEventParticipants,
  selectEventWinners,
  rerollEventWinners,
  buildEventEmbed,
  buildJoinLeaveButtons,
  restoreEventTimers,
} from '../src/services/event/EventService';
import {
  MissingPermissionsError,
  BusinessRuleError,
  ValidationError,
} from '../src/utils/errors';

const GUILD_ID = 'guild1';
const USER_ID = 'user1';
const EVENT_ID = 1;

const createMockEvent = (overrides: Partial<EventRow> = {}): EventRow => ({
  id: EVENT_ID,
  guild_id: GUILD_ID,
  channel_id: 'channel1',
  message_id: null,
  creator_id: USER_ID,
  title: 'Test Event',
  description: 'Test description',
  event_type: 'GENERAL' as EventType,
  status: 'UPCOMING' as EventStatus,
  starts_at: new Date(Date.now() + 3600000).toISOString(),
  ends_at: new Date(Date.now() + 7200000).toISOString(),
  max_participants: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockParticipant = (overrides: Partial<EventParticipantRow> = {}): EventParticipantRow => ({
  id: 1,
  event_id: EVENT_ID,
  guild_id: GUILD_ID,
  user_id: USER_ID,
  joined_at: new Date().toISOString(),
  ...overrides,
});

const createMockWinner = (overrides: Partial<EventWinnerRow> = {}): EventWinnerRow => ({
  id: 1,
  event_id: EVENT_ID,
  guild_id: GUILD_ID,
  user_id: USER_ID,
  selected_at: new Date().toISOString(),
  ...overrides,
});

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({}),
}));

const mockRepo = vi.hoisted(() => ({
  createEvent: vi.fn(),
  getEvent: vi.fn(),
  getEventsByGuild: vi.fn(),
  getActiveAndUpcomingEvents: vi.fn(),
  updateEvent: vi.fn(),
  startEvent: vi.fn(),
  endEvent: vi.fn(),
  cancelEvent: vi.fn(),
  addParticipant: vi.fn(),
  removeParticipant: vi.fn(),
  getParticipants: vi.fn(),
  countParticipants: vi.fn(),
  hasParticipant: vi.fn(),
  addWinner: vi.fn(),
  getWinners: vi.fn(),
  getWinnerUserIds: vi.fn(),
  clearWinners: vi.fn(),
  getEligibleRerollCandidates: vi.fn(),
}));

vi.mock('../src/database/repositories/EventRepository', () => ({
  EventRepository: vi.fn().mockImplementation(() => mockRepo),
}));

describe('EventRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an event', async () => {
    const mockEvent = createMockEvent();
    mockRepo.createEvent.mockResolvedValue(mockEvent);

    const repo = new EventRepository();
    const result = await repo.createEvent({
      guild_id: GUILD_ID,
      channel_id: 'channel1',
      creator_id: USER_ID,
      title: 'Test Event',
      event_type: 'GENERAL',
      starts_at: mockEvent.starts_at,
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(EVENT_ID);
  });

  it('should get an event by ID', async () => {
    const mockEvent = createMockEvent();
    mockRepo.getEvent.mockResolvedValue(mockEvent);

    const repo = new EventRepository();
    const result = await repo.getEvent(EVENT_ID);

    expect(result).toBeDefined();
    expect(result!.id).toBe(EVENT_ID);
  });

  it('should return null for non-existent event', async () => {
    mockRepo.getEvent.mockResolvedValue(null);

    const repo = new EventRepository();
    const result = await repo.getEvent(999);

    expect(result).toBeNull();
  });

  it('should list events by guild', async () => {
    const mockEvents = [createMockEvent(), createMockEvent({ id: 2, title: 'Event 2' })];
    mockRepo.getEventsByGuild.mockResolvedValue(mockEvents);

    const repo = new EventRepository();
    const result = await repo.getEventsByGuild(GUILD_ID);

    expect(result).toHaveLength(2);
  });

  it('should get active and upcoming events', async () => {
    const mockEvents = [createMockEvent(), createMockEvent({ id: 2, status: 'ACTIVE' })];
    mockRepo.getActiveAndUpcomingEvents.mockResolvedValue(mockEvents);

    const repo = new EventRepository();
    const result = await repo.getActiveAndUpcomingEvents();

    expect(result).toHaveLength(2);
  });

  it('should update an event', async () => {
    const mockEvent = createMockEvent({ status: 'ACTIVE' });
    mockRepo.updateEvent.mockResolvedValue(mockEvent);

    const repo = new EventRepository();
    const result = await repo.updateEvent(EVENT_ID, { status: 'ACTIVE' });

    expect(result).toBeDefined();
    expect(result!.status).toBe('ACTIVE');
  });

  it('should start an event', async () => {
    const mockEvent = createMockEvent({ status: 'ACTIVE' });
    mockRepo.startEvent.mockResolvedValue(mockEvent);

    const repo = new EventRepository();
    const result = await repo.startEvent(EVENT_ID);

    expect(result).toBeDefined();
    expect(result!.status).toBe('ACTIVE');
  });

  it('should end an event', async () => {
    const mockEvent = createMockEvent({ status: 'ENDED' });
    mockRepo.endEvent.mockResolvedValue(mockEvent);

    const repo = new EventRepository();
    const result = await repo.endEvent(EVENT_ID);

    expect(result).toBeDefined();
    expect(result!.status).toBe('ENDED');
  });

  it('should cancel an event', async () => {
    const mockEvent = createMockEvent({ status: 'CANCELLED' });
    mockRepo.cancelEvent.mockResolvedValue(mockEvent);

    const repo = new EventRepository();
    const result = await repo.cancelEvent(EVENT_ID);

    expect(result).toBeDefined();
    expect(result!.status).toBe('CANCELLED');
  });

  it('should add a participant', async () => {
    const mockParticipant = createMockParticipant();
    mockRepo.addParticipant.mockResolvedValue(mockParticipant);

    const repo = new EventRepository();
    const result = await repo.addParticipant({
      event_id: EVENT_ID,
      guild_id: GUILD_ID,
      user_id: USER_ID,
    });

    expect(result).toBeDefined();
    expect(result.user_id).toBe(USER_ID);
  });

  it('should remove a participant', async () => {
    mockRepo.removeParticipant.mockResolvedValue(true);

    const repo = new EventRepository();
    const result = await repo.removeParticipant(EVENT_ID, USER_ID);

    expect(result).toBe(true);
  });

  it('should get participants', async () => {
    const mockParticipants = [createMockParticipant(), createMockParticipant({ id: 2, user_id: 'user2' })];
    mockRepo.getParticipants.mockResolvedValue(mockParticipants);

    const repo = new EventRepository();
    const result = await repo.getParticipants(EVENT_ID);

    expect(result).toHaveLength(2);
  });

  it('should count participants', async () => {
    mockRepo.countParticipants.mockResolvedValue(5);

    const repo = new EventRepository();
    const result = await repo.countParticipants(EVENT_ID);

    expect(result).toBe(5);
  });

  it('should check if user is a participant', async () => {
    mockRepo.hasParticipant.mockResolvedValue(true);

    const repo = new EventRepository();
    const result = await repo.hasParticipant(EVENT_ID, USER_ID);

    expect(result).toBe(true);
  });

  it('should add a winner', async () => {
    const mockWinner = createMockWinner();
    mockRepo.addWinner.mockResolvedValue(mockWinner);

    const repo = new EventRepository();
    const result = await repo.addWinner({
      event_id: EVENT_ID,
      guild_id: GUILD_ID,
      user_id: USER_ID,
    });

    expect(result).toBeDefined();
    expect(result.user_id).toBe(USER_ID);
  });

  it('should get winners', async () => {
    const mockWinners = [createMockWinner(), createMockWinner({ id: 2, user_id: 'user2' })];
    mockRepo.getWinners.mockResolvedValue(mockWinners);

    const repo = new EventRepository();
    const result = await repo.getWinners(EVENT_ID);

    expect(result).toHaveLength(2);
  });

  it('should get winner user IDs', async () => {
    mockRepo.getWinnerUserIds.mockResolvedValue(['user1', 'user2']);

    const repo = new EventRepository();
    const result = await repo.getWinnerUserIds(EVENT_ID);

    expect(result).toEqual(['user1', 'user2']);
  });

  it('should clear winners', async () => {
    mockRepo.clearWinners.mockResolvedValue(undefined);

    const repo = new EventRepository();
    await expect(repo.clearWinners(EVENT_ID)).resolves.not.toThrow();
  });

  it('should get eligible reroll candidates', async () => {
    const mockCandidates = [createMockParticipant({ user_id: 'user2' })];
    mockRepo.getEligibleRerollCandidates.mockResolvedValue(mockCandidates);

    const repo = new EventRepository();
    const result = await repo.getEligibleRerollCandidates(EVENT_ID);

    expect(result).toHaveLength(1);
  });
});

describe('EventService - Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should reject bots', async () => {
      await expect(
        createEvent({
          guildId: GUILD_ID,
          channelId: 'ch1',
          creatorId: USER_ID,
          userBot: true,
          hasManageGuild: true,
          title: 'Test',
          type: 'GENERAL',
          startsAt: new Date(Date.now() + 3600000).toISOString(),
        })
      ).rejects.toThrow(MissingPermissionsError);
    });

    it('should reject users without ManageGuild', async () => {
      await expect(
        createEvent({
          guildId: GUILD_ID,
          channelId: 'ch1',
          creatorId: USER_ID,
          userBot: false,
          hasManageGuild: false,
          title: 'Test',
          type: 'GENERAL',
          startsAt: new Date(Date.now() + 3600000).toISOString(),
        })
      ).rejects.toThrow(MissingPermissionsError);
    });

    it('should reject max_participants < 1', async () => {
      await expect(
        createEvent({
          guildId: GUILD_ID,
          channelId: 'ch1',
          creatorId: USER_ID,
          userBot: false,
          hasManageGuild: true,
          title: 'Test',
          type: 'GENERAL',
          startsAt: new Date(Date.now() + 3600000).toISOString(),
          maxParticipants: 0,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject end before start', async () => {
      const start = new Date(Date.now() + 7200000).toISOString();
      const end = new Date(Date.now() + 3600000).toISOString();

      await expect(
        createEvent({
          guildId: GUILD_ID,
          channelId: 'ch1',
          creatorId: USER_ID,
          userBot: false,
          hasManageGuild: true,
          title: 'Test',
          type: 'GENERAL',
          startsAt: start,
          endsAt: end,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should create event successfully', async () => {
      const mockEvent = createMockEvent();
      mockRepo.createEvent.mockResolvedValue(mockEvent);

      const result = await createEvent({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        userBot: false,
        hasManageGuild: true,
        title: 'Test',
        type: 'GENERAL',
        startsAt: new Date(Date.now() + 3600000).toISOString(),
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(EVENT_ID);
    });
  });

  describe('getEventById', () => {
    it('should throw if event not found', async () => {
      mockRepo.getEvent.mockResolvedValue(null);

      await expect(getEventById(999, GUILD_ID)).rejects.toThrow(BusinessRuleError);
    });

    it('should throw if event belongs to different guild', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ guild_id: 'other_guild' })
      );

      await expect(getEventById(EVENT_ID, GUILD_ID)).rejects.toThrow(BusinessRuleError);
    });

    it('should return event when found and guild matches', async () => {
      const mockEvent = createMockEvent();
      mockRepo.getEvent.mockResolvedValue(mockEvent);

      const result = await getEventById(EVENT_ID, GUILD_ID);

      expect(result.id).toBe(EVENT_ID);
    });
  });

  describe('startEvent', () => {
    it('should throw if event is not UPCOMING', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE' })
      );

      await expect(
        startEvent(EVENT_ID, GUILD_ID, USER_ID, true, [])
      ).rejects.toThrow('Only upcoming events can be started');
    });

    it('should throw if non-creator non-privileged tries to start', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ creator_id: 'other_user' })
      );

      await expect(
        startEvent(EVENT_ID, GUILD_ID, USER_ID, false, [])
      ).rejects.toThrow(MissingPermissionsError);
    });

    it('should allow creator to start', async () => {
      mockRepo.getEvent.mockResolvedValue(createMockEvent());
      mockRepo.startEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE' })
      );

      const result = await startEvent(EVENT_ID, GUILD_ID, USER_ID, false, []);

      expect(result.status).toBe('ACTIVE');
    });

    it('should allow ManageGuild to start', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ creator_id: 'other_user' })
      );
      mockRepo.startEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE' })
      );

      const result = await startEvent(EVENT_ID, GUILD_ID, USER_ID, true, []);

      expect(result.status).toBe('ACTIVE');
    });

    it('should allow bot owner to start', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ creator_id: 'other_user' })
      );
      mockRepo.startEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE' })
      );

      const result = await startEvent(EVENT_ID, GUILD_ID, USER_ID, false, [USER_ID]);

      expect(result.status).toBe('ACTIVE');
    });

    it('should throw if startEvent returns null (already started)', async () => {
      mockRepo.getEvent.mockResolvedValue(createMockEvent());
      mockRepo.startEvent.mockResolvedValue(null);

      await expect(
        startEvent(EVENT_ID, GUILD_ID, USER_ID, true, [])
      ).rejects.toThrow('Event has already been started');
    });
  });

  describe('endEvent', () => {
    it('should throw if event is not ACTIVE', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'UPCOMING' })
      );

      await expect(
        endEvent(EVENT_ID, GUILD_ID, USER_ID, true, [])
      ).rejects.toThrow('Only active events can be ended');
    });

    it('should throw if non-creator non-privileged tries to end', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE', creator_id: 'other_user' })
      );

      await expect(
        endEvent(EVENT_ID, GUILD_ID, USER_ID, false, [])
      ).rejects.toThrow(MissingPermissionsError);
    });

    it('should allow creator to end', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE' })
      );
      mockRepo.endEvent.mockResolvedValue(
        createMockEvent({ status: 'ENDED' })
      );

      const result = await endEvent(EVENT_ID, GUILD_ID, USER_ID, false, []);

      expect(result.status).toBe('ENDED');
    });

    it('should allow ManageGuild to end', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE', creator_id: 'other_user' })
      );
      mockRepo.endEvent.mockResolvedValue(
        createMockEvent({ status: 'ENDED' })
      );

      const result = await endEvent(EVENT_ID, GUILD_ID, USER_ID, true, []);

      expect(result.status).toBe('ENDED');
    });

    it('should throw if endEvent returns null', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE' })
      );
      mockRepo.endEvent.mockResolvedValue(null);

      await expect(
        endEvent(EVENT_ID, GUILD_ID, USER_ID, true, [])
      ).rejects.toThrow('Event has already been ended');
    });
  });

  describe('cancelEvent', () => {
    it('should throw without ManageGuild', async () => {
      await expect(
        cancelEvent(EVENT_ID, GUILD_ID, false)
      ).rejects.toThrow(MissingPermissionsError);
    });

    it('should throw if event is ENDED', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ENDED' })
      );

      await expect(
        cancelEvent(EVENT_ID, GUILD_ID, true)
      ).rejects.toThrow('Event is already ended or cancelled');
    });

    it('should throw if event is CANCELLED', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'CANCELLED' })
      );

      await expect(
        cancelEvent(EVENT_ID, GUILD_ID, true)
      ).rejects.toThrow('Event is already ended or cancelled');
    });

    it('should cancel UPCOMING event', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'UPCOMING' })
      );
      mockRepo.cancelEvent.mockResolvedValue(
        createMockEvent({ status: 'CANCELLED' })
      );

      const result = await cancelEvent(EVENT_ID, GUILD_ID, true);

      expect(result.status).toBe('CANCELLED');
    });

    it('should cancel ACTIVE event', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE' })
      );
      mockRepo.cancelEvent.mockResolvedValue(
        createMockEvent({ status: 'CANCELLED' })
      );

      const result = await cancelEvent(EVENT_ID, GUILD_ID, true);

      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('joinEvent', () => {
    it('should reject bots', async () => {
      await expect(
        joinEvent(EVENT_ID, GUILD_ID, USER_ID, true)
      ).rejects.toThrow(MissingPermissionsError);
    });

    it('should throw if event is CANCELLED', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'CANCELLED' })
      );

      await expect(
        joinEvent(EVENT_ID, GUILD_ID, USER_ID, false)
      ).rejects.toThrow('Cannot join a cancelled event');
    });

    it('should throw if event is ENDED', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ENDED' })
      );

      await expect(
        joinEvent(EVENT_ID, GUILD_ID, USER_ID, false)
      ).rejects.toThrow('Cannot join an ended event');
    });

    it('should throw if max participants reached', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ max_participants: 1 })
      );
      mockRepo.countParticipants.mockResolvedValue(1);

      await expect(
        joinEvent(EVENT_ID, GUILD_ID, USER_ID, false)
      ).rejects.toThrow('Event has reached maximum participants');
    });

    it('should throw if already joined', async () => {
      mockRepo.getEvent.mockResolvedValue(createMockEvent());
      mockRepo.addParticipant.mockRejectedValue(
        new (await import('../src/utils/errors')).DatabaseQueryError('ALREADY_JOINED')
      );

      await expect(
        joinEvent(EVENT_ID, GUILD_ID, USER_ID, false)
      ).rejects.toThrow('You have already joined this event');
    });

    it('should allow joining UPCOMING events', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'UPCOMING' })
      );
      mockRepo.addParticipant.mockResolvedValue(createMockParticipant());
      mockRepo.countParticipants.mockResolvedValue(1);

      const result = await joinEvent(EVENT_ID, GUILD_ID, USER_ID, false);

      expect(result.participantCount).toBe(1);
    });

    it('should allow joining ACTIVE events', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE' })
      );
      mockRepo.addParticipant.mockResolvedValue(createMockParticipant());
      mockRepo.countParticipants.mockResolvedValue(1);

      const result = await joinEvent(EVENT_ID, GUILD_ID, USER_ID, false);

      expect(result.participantCount).toBe(1);
    });

    it('should not check max_participants when not set', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ max_participants: null })
      );
      mockRepo.addParticipant.mockResolvedValue(createMockParticipant());
      mockRepo.countParticipants.mockResolvedValue(100);

      const result = await joinEvent(EVENT_ID, GUILD_ID, USER_ID, false);

      expect(result.participantCount).toBe(100);
    });
  });

  describe('leaveEvent', () => {
    it('should throw if not a participant', async () => {
      mockRepo.getEvent.mockResolvedValue(createMockEvent());
      mockRepo.removeParticipant.mockResolvedValue(false);

      await expect(
        leaveEvent(EVENT_ID, GUILD_ID, USER_ID)
      ).rejects.toThrow('You are not a participant of this event');
    });

    it('should allow leaving', async () => {
      mockRepo.getEvent.mockResolvedValue(createMockEvent());
      mockRepo.removeParticipant.mockResolvedValue(true);
      mockRepo.countParticipants.mockResolvedValue(0);

      const result = await leaveEvent(EVENT_ID, GUILD_ID, USER_ID);

      expect(result.participantCount).toBe(0);
    });
  });

  describe('selectEventWinners', () => {
    it('should throw if event is not ENDED', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE' })
      );

      await expect(
        selectEventWinners(EVENT_ID, GUILD_ID, USER_ID, 1, true, [])
      ).rejects.toThrow('Winners can only be selected after an event has ended');
    });

    it('should throw if non-creator non-privileged tries to select', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ENDED', creator_id: 'other_user' })
      );

      await expect(
        selectEventWinners(EVENT_ID, GUILD_ID, USER_ID, 1, false, [])
      ).rejects.toThrow(MissingPermissionsError);
    });

    it('should throw if no eligible participants', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ENDED' })
      );
      mockRepo.countParticipants.mockResolvedValue(0);
      mockRepo.getWinnerUserIds.mockResolvedValue([]);

      await expect(
        selectEventWinners(EVENT_ID, GUILD_ID, USER_ID, 1, true, [])
      ).rejects.toThrow('No eligible participants available for winner selection');
    });

    it('should select winners', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ENDED' })
      );
      mockRepo.countParticipants.mockResolvedValue(3);
      mockRepo.getWinnerUserIds.mockResolvedValue([]);
      mockRepo.clearWinners.mockResolvedValue(undefined);
      mockRepo.getEligibleRerollCandidates.mockResolvedValue([
        createMockParticipant({ user_id: 'user1' }),
        createMockParticipant({ id: 2, user_id: 'user2' }),
        createMockParticipant({ id: 3, user_id: 'user3' }),
      ]);
      mockRepo.addWinner.mockImplementation(async (data: { user_id: string }) =>
        createMockWinner({ user_id: data.user_id })
      );

      const result = await selectEventWinners(EVENT_ID, GUILD_ID, USER_ID, 2, true, []);

      expect(result).toHaveLength(2);
    });

    it('should cap count at available participants', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ENDED' })
      );
      mockRepo.countParticipants.mockResolvedValue(1);
      mockRepo.getWinnerUserIds.mockResolvedValue([]);
      mockRepo.clearWinners.mockResolvedValue(undefined);
      mockRepo.getEligibleRerollCandidates.mockResolvedValue([
        createMockParticipant({ user_id: 'user1' }),
      ]);
      mockRepo.addWinner.mockImplementation(async (data: { user_id: string }) =>
        createMockWinner({ user_id: data.user_id })
      );

      const result = await selectEventWinners(EVENT_ID, GUILD_ID, USER_ID, 10, true, []);

      expect(result).toHaveLength(1);
    });

    it('should allow creator to select winners', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ENDED' })
      );
      mockRepo.countParticipants.mockResolvedValue(1);
      mockRepo.getWinnerUserIds.mockResolvedValue([]);
      mockRepo.clearWinners.mockResolvedValue(undefined);
      mockRepo.getEligibleRerollCandidates.mockResolvedValue([
        createMockParticipant({ user_id: 'user1' }),
      ]);
      mockRepo.addWinner.mockImplementation(async (data: { user_id: string }) =>
        createMockWinner({ user_id: data.user_id })
      );

      const result = await selectEventWinners(EVENT_ID, GUILD_ID, USER_ID, 1, false, []);

      expect(result).toHaveLength(1);
    });
  });

  describe('rerollEventWinners', () => {
    it('should throw if event is not ENDED', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ACTIVE' })
      );

      await expect(
        rerollEventWinners(EVENT_ID, GUILD_ID, USER_ID, 1, true, [])
      ).rejects.toThrow('Winners can only be rerolled after an event has ended');
    });

    it('should throw if no eligible participants for reroll', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ENDED' })
      );
      mockRepo.countParticipants.mockResolvedValue(2);
      mockRepo.getWinnerUserIds.mockResolvedValue(['user1', 'user2']);

      await expect(
        rerollEventWinners(EVENT_ID, GUILD_ID, USER_ID, 1, true, [])
      ).rejects.toThrow('No eligible participants available for winner selection');
    });

    it('should reroll winners successfully', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ status: 'ENDED' })
      );
      mockRepo.countParticipants.mockResolvedValue(3);
      mockRepo.getWinnerUserIds.mockResolvedValue(['user1']);
      mockRepo.getEligibleRerollCandidates.mockResolvedValue([
        createMockParticipant({ user_id: 'user2' }),
        createMockParticipant({ id: 2, user_id: 'user3' }),
      ]);
      mockRepo.addWinner.mockImplementation(async (data: { user_id: string }) =>
        createMockWinner({ user_id: data.user_id })
      );

      const result = await rerollEventWinners(EVENT_ID, GUILD_ID, USER_ID, 1, true, []);

      expect(result).toHaveLength(1);
    });
  });

  describe('listEventsByGuild', () => {
    it('should list events', async () => {
      mockRepo.getEventsByGuild.mockResolvedValue([
        createMockEvent(),
        createMockEvent({ id: 2 }),
      ]);

      const result = await listEventsByGuild(GUILD_ID);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no events', async () => {
      mockRepo.getEventsByGuild.mockResolvedValue([]);

      const result = await listEventsByGuild(GUILD_ID);

      expect(result).toHaveLength(0);
    });
  });

  describe('getEventParticipants', () => {
    it('should get participants', async () => {
      mockRepo.getEvent.mockResolvedValue(createMockEvent());
      mockRepo.getParticipants.mockResolvedValue([
        createMockParticipant(),
        createMockParticipant({ id: 2, user_id: 'user2' }),
      ]);

      const result = await getEventParticipants(EVENT_ID, GUILD_ID);

      expect(result).toHaveLength(2);
    });

    it('should throw if event not found', async () => {
      mockRepo.getEvent.mockResolvedValue(null);

      await expect(getEventParticipants(999, GUILD_ID)).rejects.toThrow(BusinessRuleError);
    });

    it('should throw if event belongs to different guild', async () => {
      mockRepo.getEvent.mockResolvedValue(
        createMockEvent({ guild_id: 'other_guild' })
      );

      await expect(getEventParticipants(EVENT_ID, GUILD_ID)).rejects.toThrow(BusinessRuleError);
    });
  });
});

describe('EventService - Embeds & Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build an embed for UPCOMING event', () => {
    const event = createMockEvent({ status: 'UPCOMING' });
    const embed = buildEventEmbed(event, 0);

    expect(embed).toBeDefined();
    const json = embed.toJSON();
    expect(json.title).toContain('Test Event');
    expect(json.fields).toBeDefined();
  });

  it('should build an embed for ACTIVE event', () => {
    const event = createMockEvent({ status: 'ACTIVE' });
    const embed = buildEventEmbed(event, 5);

    expect(embed).toBeDefined();
    expect(embed.toJSON().fields).toBeDefined();
  });

  it('should build an embed for ENDED event', () => {
    const event = createMockEvent({ status: 'ENDED' });
    const embed = buildEventEmbed(event, 3);

    expect(embed).toBeDefined();
  });

  it('should build an embed for CANCELLED event', () => {
    const event = createMockEvent({ status: 'CANCELLED' });
    const embed = buildEventEmbed(event, 0);

    expect(embed).toBeDefined();
  });

  it('should show max_participants when set', () => {
    const event = createMockEvent({ max_participants: 50 });
    const embed = buildEventEmbed(event, 25);

    const json = embed.toJSON();
    const participantField = json.fields?.find(f => f.name === '👥 Participants');
    expect(participantField?.value).toBe('25 / 50');
  });

  it('should show participant count without max when not set', () => {
    const event = createMockEvent({ max_participants: null });
    const embed = buildEventEmbed(event, 10);

    const json = embed.toJSON();
    const participantField = json.fields?.find(f => f.name === '👥 Participants');
    expect(participantField?.value).toBe('10');
  });

  it('should handle event without ends_at', () => {
    const event = createMockEvent({ ends_at: null });
    const embed = buildEventEmbed(event, 0);

    const json = embed.toJSON();
    const endField = json.fields?.find(f => f.name === '🏁 End');
    expect(endField).toBeUndefined();
  });

  it('should include end time when ends_at is set', () => {
    const event = createMockEvent({ ends_at: new Date(Date.now() + 7200000).toISOString() });
    const embed = buildEventEmbed(event, 0);

    const json = embed.toJSON();
    const endField = json.fields?.find(f => f.name === '🏁 End');
    expect(endField).toBeDefined();
  });

  it('should create join and leave buttons', () => {
    const row = buildJoinLeaveButtons(EVENT_ID);

    expect(row).toBeDefined();
    expect(row.components).toHaveLength(2);
    expect(row.components[0].data.custom_id).toBe(`event:join:${EVENT_ID}`);
    expect(row.components[1].data.custom_id).toBe(`event:leave:${EVENT_ID}`);
  });
});

describe('EventService - Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prevent cross-guild event access in getEventById', async () => {
    mockRepo.getEvent.mockResolvedValue(
      createMockEvent({ guild_id: 'other_guild' })
    );

    await expect(getEventById(EVENT_ID, GUILD_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should prevent bots from creating events', async () => {
    await expect(
      createEvent({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: 'bot_user',
        userBot: true,
        hasManageGuild: true,
        title: 'Bot Event',
        type: 'GENERAL',
        startsAt: new Date(Date.now() + 3600000).toISOString(),
      })
    ).rejects.toThrow(MissingPermissionsError);
  });

  it('should prevent non-privileged users from cancelling events', async () => {
    await expect(
      cancelEvent(EVENT_ID, GUILD_ID, false)
    ).rejects.toThrow(MissingPermissionsError);
  });

  it('should prevent non-privileged users from selecting winners', async () => {
    mockRepo.getEvent.mockResolvedValue(
      createMockEvent({ status: 'ENDED', creator_id: 'other_user' })
    );

    await expect(
      selectEventWinners(EVENT_ID, GUILD_ID, USER_ID, 1, false, [])
    ).rejects.toThrow(MissingPermissionsError);
  });

  it('should prevent non-privileged users from rerolling winners', async () => {
    mockRepo.getEvent.mockResolvedValue(
      createMockEvent({ status: 'ENDED', creator_id: 'other_user' })
    );

    await expect(
      rerollEventWinners(EVENT_ID, GUILD_ID, USER_ID, 1, false, [])
    ).rejects.toThrow(MissingPermissionsError);
  });

  it('should prevent non-privileged users from starting events', async () => {
    mockRepo.getEvent.mockResolvedValue(
      createMockEvent({ creator_id: 'other_user' })
    );

    await expect(
      startEvent(EVENT_ID, GUILD_ID, USER_ID, false, [])
    ).rejects.toThrow(MissingPermissionsError);
  });

  it('should prevent non-privileged users from ending events', async () => {
    mockRepo.getEvent.mockResolvedValue(
      createMockEvent({ status: 'ACTIVE', creator_id: 'other_user' })
    );

    await expect(
      endEvent(EVENT_ID, GUILD_ID, USER_ID, false, [])
    ).rejects.toThrow(MissingPermissionsError);
  });
});

describe('EventService - restoreEventTimers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should restore timers without errors', async () => {
    mockRepo.getActiveAndUpcomingEvents.mockResolvedValue([
      createMockEvent({ status: 'UPCOMING' }),
      createMockEvent({ id: 2, status: 'ACTIVE' }),
    ]);
    mockRepo.startEvent.mockResolvedValue(null);
    mockRepo.endEvent.mockResolvedValue(null);

    await expect(restoreEventTimers()).resolves.not.toThrow();
  });

  it('should handle errors gracefully', async () => {
    mockRepo.getActiveAndUpcomingEvents.mockRejectedValue(
      new Error('DB error')
    );

    await expect(restoreEventTimers()).resolves.not.toThrow();
  });

  it('should transition expired UPCOMING to ACTIVE', async () => {
    mockRepo.getActiveAndUpcomingEvents.mockResolvedValue([
      createMockEvent({
        status: 'UPCOMING',
        starts_at: new Date(Date.now() - 3600000).toISOString(),
      }),
    ]);
    mockRepo.startEvent.mockResolvedValue(
      createMockEvent({ status: 'ACTIVE' })
    );

    await restoreEventTimers();

    expect(mockRepo.startEvent).toHaveBeenCalled();
  });

  it('should end expired ACTIVE events', async () => {
    mockRepo.getActiveAndUpcomingEvents.mockResolvedValue([
      createMockEvent({
        status: 'ACTIVE',
        ends_at: new Date(Date.now() - 3600000).toISOString(),
      }),
    ]);
    mockRepo.endEvent.mockResolvedValue(
      createMockEvent({ status: 'ENDED' })
    );

    await restoreEventTimers();

    expect(mockRepo.endEvent).toHaveBeenCalled();
  });
});
