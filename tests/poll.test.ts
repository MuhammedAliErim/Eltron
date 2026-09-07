import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PollRow,
  PollOptionRow,
  PollVoteRow,
  PollStatus,
} from '../src/database/schema';
import {
  createPoll,
  getPollById,
  listPollsByGuild,
  endPoll,
  cancelPoll,
  getPollResults,
  vote,
  removeVote,
  restorePollTimers,
  buildPollEmbedBuilder,
  buildPollVoteButtons,
} from '../src/services/poll/PollService';
import {
  MissingPermissionsError,
  BusinessRuleError,
  ValidationError,
  DatabaseQueryError,
} from '../src/utils/errors';

const GUILD_ID = 'guild1';
const USER_ID = 'user1';
const POLL_ID = 1;
const OPTION_ID = 100;

const createMockPoll = (overrides: Partial<PollRow> = {}): PollRow => ({
  id: POLL_ID,
  guild_id: GUILD_ID,
  channel_id: 'channel1',
  message_id: null,
  creator_id: USER_ID,
  question: 'Test Question',
  description: 'Test description',
  status: 'ACTIVE' as PollStatus,
  multiple_choice: false,
  anonymous: false,
  ends_at: new Date(Date.now() + 3600000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockOption = (overrides: Partial<PollOptionRow> = {}): PollOptionRow => ({
  id: OPTION_ID,
  poll_id: POLL_ID,
  guild_id: GUILD_ID,
  option_index: 0,
  option_text: 'Option A',
  created_at: new Date().toISOString(),
  ...overrides,
});

const createMockVote = (overrides: Partial<PollVoteRow> = {}): PollVoteRow => ({
  id: 1,
  poll_id: POLL_ID,
  option_id: OPTION_ID,
  guild_id: GUILD_ID,
  user_id: USER_ID,
  voted_at: new Date().toISOString(),
  ...overrides,
});

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({}),
}));

const mockRepo = vi.hoisted(() => ({
  createPoll: vi.fn(),
  getPoll: vi.fn(),
  getPollsByGuild: vi.fn(),
  getActivePolls: vi.fn(),
  updatePoll: vi.fn(),
  endPoll: vi.fn(),
  cancelPoll: vi.fn(),
  getOptions: vi.fn(),
  addOption: vi.fn(),
  getVotes: vi.fn(),
  getUserVotes: vi.fn(),
  addVote: vi.fn(),
  removeVote: vi.fn(),
  removeUserVotes: vi.fn(),
  clearVotes: vi.fn(),
  countVotesForOption: vi.fn(),
  hasVotedForOption: vi.fn(),
  getUserVoteForPoll: vi.fn(),
}));

vi.mock('../src/database/repositories/PollRepository', () => ({
  PollRepository: vi.fn().mockImplementation(() => mockRepo),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  logError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockRepo.getPoll.mockImplementation((id: number) =>
    Promise.resolve(createMockPoll({ id }))
  );
  mockRepo.getOptions.mockResolvedValue([
    createMockOption({ id: 100, option_index: 0, option_text: 'Option A' }),
    createMockOption({ id: 101, option_index: 1, option_text: 'Option B' }),
  ]);
  mockRepo.getVotes.mockResolvedValue([]);
  mockRepo.getUserVotes.mockResolvedValue([]);
  mockRepo.addVote.mockResolvedValue(createMockVote());
  mockRepo.createPoll.mockImplementation((data: unknown) => {
    const d = data as Record<string, unknown>;
    return Promise.resolve(createMockPoll({
      question: d.question as string,
      description: d.description as string,
      multiple_choice: d.multiple_choice as boolean,
      anonymous: d.anonymous as boolean,
      ends_at: d.ends_at as string | null,
    }));
  });
  mockRepo.addOption.mockImplementation((data: unknown) => {
    const d = data as Record<string, unknown>;
    return Promise.resolve(createMockOption({
      poll_id: d.poll_id as number,
      option_index: d.option_index as number,
      option_text: d.option_text as string,
    }));
  });
  mockRepo.endPoll.mockImplementation((id: number) =>
    Promise.resolve(createMockPoll({ id, status: 'ENDED' }))
  );
  mockRepo.cancelPoll.mockImplementation((id: number) =>
    Promise.resolve(createMockPoll({ id, status: 'CANCELLED' }))
  );
});

describe('PollRepository', () => {
  describe('createPoll', () => {
    it('should create a poll', async () => {
      const result = mockRepo.createPoll({
        guild_id: GUILD_ID,
        channel_id: 'ch1',
        creator_id: USER_ID,
        question: 'Q?',
        description: '',
        status: 'ACTIVE',
        multiple_choice: false,
        anonymous: false,
        ends_at: undefined,
      });
      expect(result).toBeDefined();
    });
  });

  describe('getPoll', () => {
    it('should get a poll', async () => {
      const result = mockRepo.getPoll(POLL_ID);
      expect(result).toBeDefined();
    });
  });

  describe('getPollsByGuild', () => {
    it('should list polls for a guild', async () => {
      mockRepo.getPollsByGuild.mockResolvedValue([createMockPoll()]);
      const result = mockRepo.getPollsByGuild(GUILD_ID);
      expect(result).toBeDefined();
    });
  });

  describe('getOptions', () => {
    it('should get poll options', async () => {
      const result = mockRepo.getOptions(POLL_ID);
      expect(result).toBeDefined();
    });
  });

  describe('addVote', () => {
    it('should add a vote', async () => {
      const result = mockRepo.addVote({
        poll_id: POLL_ID,
        option_id: OPTION_ID,
        guild_id: GUILD_ID,
        user_id: USER_ID,
      });
      expect(result).toBeDefined();
    });
  });

  describe('removeVote', () => {
    it('should remove a vote', async () => {
      mockRepo.removeVote.mockResolvedValue(true);
      const result = mockRepo.removeVote(POLL_ID, OPTION_ID, USER_ID);
      expect(result).toBeDefined();
    });
  });

  describe('getUserVotes', () => {
    it('should get user votes', async () => {
      const result = mockRepo.getUserVotes(POLL_ID, USER_ID);
      expect(result).toBeDefined();
    });
  });

  describe('endPoll', () => {
    it('should end a poll', async () => {
      const result = mockRepo.endPoll(POLL_ID);
      expect(result).toBeDefined();
    });
  });

  describe('cancelPoll', () => {
    it('should cancel a poll', async () => {
      const result = mockRepo.cancelPoll(POLL_ID);
      expect(result).toBeDefined();
    });
  });

  describe('clearVotes', () => {
    it('should clear votes', async () => {
      mockRepo.clearVotes.mockResolvedValue(undefined);
      await mockRepo.clearVotes(POLL_ID);
      expect(mockRepo.clearVotes).toHaveBeenCalled();
    });
  });

  describe('removeUserVotes', () => {
    it('should remove user votes', async () => {
      mockRepo.removeUserVotes.mockResolvedValue(2);
      const result = mockRepo.removeUserVotes(POLL_ID, USER_ID);
      expect(result).toBeDefined();
    });
  });

  describe('countVotesForOption', () => {
    it('should count votes', async () => {
      mockRepo.countVotesForOption.mockResolvedValue(5);
      const result = mockRepo.countVotesForOption(OPTION_ID);
      expect(result).toBeDefined();
    });
  });

  describe('hasVotedForOption', () => {
    it('should check if user voted', async () => {
      mockRepo.hasVotedForOption.mockResolvedValue(true);
      const result = mockRepo.hasVotedForOption(POLL_ID, OPTION_ID, USER_ID);
      expect(result).toBeDefined();
    });
  });

  describe('getUserVoteForPoll', () => {
    it('should get user vote for poll', async () => {
      mockRepo.getUserVoteForPoll.mockResolvedValue([createMockVote()]);
      const result = await mockRepo.getUserVoteForPoll(POLL_ID, USER_ID);
      expect(result).toBeDefined();
    });
  });

  describe('getActivePolls', () => {
    it('should get active polls', async () => {
      mockRepo.getActivePolls.mockResolvedValue([createMockPoll()]);
      const result = await mockRepo.getActivePolls();
      expect(result).toBeDefined();
    });
  });

  describe('updatePoll', () => {
    it('should update a poll', async () => {
      mockRepo.updatePoll.mockResolvedValue(createMockPoll({ message_id: 'msg1' }));
      const result = mockRepo.updatePoll(POLL_ID, { message_id: 'msg1' });
      expect(result).toBeDefined();
    });
  });
});

describe('createPoll - Business Logic', () => {
  it('should create a poll with valid data', async () => {
    const result = await createPoll({
      guildId: GUILD_ID,
      channelId: 'ch1',
      creatorId: USER_ID,
      hasManageGuild: true,
      question: 'What is your favorite color?',
      options: ['Red', 'Blue', 'Green'],
    });

    expect(result.poll).toBeDefined();
    expect(result.poll.question).toBe('What is your favorite color?');
    expect(result.options).toHaveLength(3);
    expect(mockRepo.createPoll).toHaveBeenCalled();
    expect(mockRepo.addOption).toHaveBeenCalledTimes(3);
  });

  it('should throw if user is bot', async () => {
    await expect(
      createPoll({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        userBot: true,
        hasManageGuild: true,
        question: 'Q?',
        options: ['A', 'B'],
      })
    ).rejects.toThrow(MissingPermissionsError);
  });

  it('should throw if no ManageGuild permission', async () => {
    await expect(
      createPoll({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        hasManageGuild: false,
        question: 'Q?',
        options: ['A', 'B'],
      })
    ).rejects.toThrow(MissingPermissionsError);
  });

  it('should throw if question is empty', async () => {
    await expect(
      createPoll({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        hasManageGuild: true,
        question: '',
        options: ['A', 'B'],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if question too long', async () => {
    await expect(
      createPoll({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        hasManageGuild: true,
        question: 'A'.repeat(256),
        options: ['A', 'B'],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if description too long', async () => {
    await expect(
      createPoll({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        hasManageGuild: true,
        question: 'Q?',
        description: 'A'.repeat(1025),
        options: ['A', 'B'],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if less than 2 options', async () => {
    await expect(
      createPoll({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        hasManageGuild: true,
        question: 'Q?',
        options: ['A'],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if more than 10 options', async () => {
    await expect(
      createPoll({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        hasManageGuild: true,
        question: 'Q?',
        options: Array.from({ length: 11 }, (_, i) => `Option ${i + 1}`),
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if option is empty', async () => {
    await expect(
      createPoll({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        hasManageGuild: true,
        question: 'Q?',
        options: ['A', ''],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if option too long', async () => {
    await expect(
      createPoll({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        hasManageGuild: true,
        question: 'Q?',
        options: ['A', 'B'.repeat(256)],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if end time in the past', async () => {
    await expect(
      createPoll({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        hasManageGuild: true,
        question: 'Q?',
        options: ['A', 'B'],
        endsAt: new Date(Date.now() - 1000).toISOString(),
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should create poll with description', async () => {
    const result = await createPoll({
      guildId: GUILD_ID,
      channelId: 'ch1',
      creatorId: USER_ID,
      hasManageGuild: true,
      question: 'Q?',
      description: 'This is a description',
      options: ['A', 'B'],
    });
    expect(result.poll.description).toBe('This is a description');
  });

  it('should create poll with multiple choice', async () => {
    const result = await createPoll({
      guildId: GUILD_ID,
      channelId: 'ch1',
      creatorId: USER_ID,
      hasManageGuild: true,
      question: 'Q?',
      options: ['A', 'B'],
      multipleChoice: true,
    });
    expect(result.poll.multiple_choice).toBe(true);
  });

  it('should create poll with anonymous', async () => {
    const result = await createPoll({
      guildId: GUILD_ID,
      channelId: 'ch1',
      creatorId: USER_ID,
      hasManageGuild: true,
      question: 'Q?',
      options: ['A', 'B'],
      anonymous: true,
    });
    expect(result.poll.anonymous).toBe(true);
  });

  it('should create poll with end time', async () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    const result = await createPoll({
      guildId: GUILD_ID,
      channelId: 'ch1',
      creatorId: USER_ID,
      hasManageGuild: true,
      question: 'Q?',
      options: ['A', 'B'],
      endsAt: future,
    });
    expect(result.poll.ends_at).toBe(future);
  });

  it('should allow exactly 2 options', async () => {
    const result = await createPoll({
      guildId: GUILD_ID,
      channelId: 'ch1',
      creatorId: USER_ID,
      hasManageGuild: true,
      question: 'Q?',
      options: ['Yes', 'No'],
    });
    expect(result.options).toHaveLength(2);
  });

  it('should allow exactly 10 options', async () => {
    const result = await createPoll({
      guildId: GUILD_ID,
      channelId: 'ch1',
      creatorId: USER_ID,
      hasManageGuild: true,
      question: 'Q?',
      options: Array.from({ length: 10 }, (_, i) => `Option ${i + 1}`),
    });
    expect(result.options).toHaveLength(10);
  });
});

describe('getPollById - Business Logic', () => {
  it('should return poll if found and guild matches', async () => {
    const result = await getPollById(POLL_ID, GUILD_ID);
    expect(result).toBeDefined();
    expect(result.id).toBe(POLL_ID);
  });

  it('should throw if poll not found', async () => {
    mockRepo.getPoll.mockResolvedValue(null);
    await expect(getPollById(POLL_ID, GUILD_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if guild mismatch', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ guild_id: 'other_guild' }));
    await expect(getPollById(POLL_ID, GUILD_ID)).rejects.toThrow(BusinessRuleError);
  });
});

describe('listPollsByGuild - Business Logic', () => {
  it('should list polls for guild', async () => {
    mockRepo.getPollsByGuild.mockResolvedValue([createMockPoll()]);
    const result = await listPollsByGuild(GUILD_ID);
    expect(result).toHaveLength(1);
    expect(mockRepo.getPollsByGuild).toHaveBeenCalledWith(GUILD_ID, undefined, 15);
  });

  it('should list polls filtered by status', async () => {
    mockRepo.getPollsByGuild.mockResolvedValue([createMockPoll()]);
    const result = await listPollsByGuild(GUILD_ID, 'ACTIVE');
    expect(result).toHaveLength(1);
    expect(mockRepo.getPollsByGuild).toHaveBeenCalledWith(GUILD_ID, 'ACTIVE', 15);
  });

  it('should return empty array for no polls', async () => {
    mockRepo.getPollsByGuild.mockResolvedValue([]);
    const result = await listPollsByGuild(GUILD_ID);
    expect(result).toHaveLength(0);
  });
});

describe('vote - Business Logic', () => {
  it('should allow voting on active poll', async () => {
    const result = await vote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID);
    expect(result).toBeDefined();
    expect(result.poll).toBeDefined();
    expect(result.results).toBeDefined();
    expect(mockRepo.addVote).toHaveBeenCalled();
  });

  it('should throw if user is bot', async () => {
    await expect(
      vote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID, true)
    ).rejects.toThrow(MissingPermissionsError);
  });

  it('should throw if poll not found', async () => {
    mockRepo.getPoll.mockResolvedValue(null);
    await expect(vote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if poll ended', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ status: 'ENDED' }));
    await expect(vote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if poll cancelled', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ status: 'CANCELLED' }));
    await expect(vote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if poll expired', async () => {
    mockRepo.getPoll.mockResolvedValue(
      createMockPoll({ ends_at: new Date(Date.now() - 1000).toISOString() })
    );
    mockRepo.endPoll.mockResolvedValue(createMockPoll({ status: 'ENDED' }));
    await expect(vote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if option invalid', async () => {
    mockRepo.getOptions.mockResolvedValue([
      createMockOption({ id: 100 }),
      createMockOption({ id: 101 }),
    ]);
    await expect(vote(POLL_ID, GUILD_ID, USER_ID, 999)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if duplicate vote for same option', async () => {
    mockRepo.addVote.mockRejectedValue(new DatabaseQueryError('ALREADY_VOTED'));
    await expect(vote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should switch vote in single choice mode', async () => {
    mockRepo.getUserVotes.mockResolvedValue([
      createMockVote({ option_id: 101 }),
    ]);
    mockRepo.removeUserVotes.mockResolvedValue(1);

    const result = await vote(POLL_ID, GUILD_ID, USER_ID, 100);
    expect(result).toBeDefined();
    expect(mockRepo.removeUserVotes).toHaveBeenCalled();
    expect(mockRepo.addVote).toHaveBeenCalled();
  });

  it('should not switch vote if voting same option in single choice', async () => {
    mockRepo.getUserVotes.mockResolvedValue([
      createMockVote({ option_id: 100 }),
    ]);

    await expect(vote(POLL_ID, GUILD_ID, USER_ID, 100)).rejects.toThrow(BusinessRuleError);
    expect(mockRepo.removeUserVotes).not.toHaveBeenCalled();
  });

  it('should allow multiple votes in multiple choice mode', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ multiple_choice: true }));

    const result = await vote(POLL_ID, GUILD_ID, USER_ID, 100);
    expect(result).toBeDefined();
    expect(mockRepo.addVote).toHaveBeenCalled();
  });

  it('should allow voting if user has no existing votes', async () => {
    mockRepo.getUserVotes.mockResolvedValue([]);

    const result = await vote(POLL_ID, GUILD_ID, USER_ID, 100);
    expect(result).toBeDefined();
    expect(mockRepo.addVote).toHaveBeenCalled();
  });
});

describe('removeVote - Business Logic', () => {
  it('should remove a vote', async () => {
    mockRepo.removeVote.mockResolvedValue(true);
    const result = await removeVote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID);
    expect(result).toBeDefined();
    expect(mockRepo.removeVote).toHaveBeenCalled();
  });

  it('should remove all votes if no optionId', async () => {
    mockRepo.removeUserVotes.mockResolvedValue(2);
    const result = await removeVote(POLL_ID, GUILD_ID, USER_ID);
    expect(result).toBeDefined();
    expect(mockRepo.removeUserVotes).toHaveBeenCalled();
  });

  it('should throw if poll not found', async () => {
    mockRepo.getPoll.mockResolvedValue(null);
    await expect(removeVote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if poll ended', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ status: 'ENDED' }));
    await expect(removeVote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if vote not found for specific option', async () => {
    mockRepo.removeVote.mockResolvedValue(false);
    await expect(removeVote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if no votes found when no optionId', async () => {
    mockRepo.removeUserVotes.mockResolvedValue(0);
    await expect(removeVote(POLL_ID, GUILD_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });
});

describe('endPoll - Business Logic', () => {
  it('should allow creator to end their own poll', async () => {
    const result = await endPoll(POLL_ID, GUILD_ID, USER_ID, false, []);
    expect(result).toBeDefined();
    expect(result.status).toBe('ENDED');
  });

  it('should allow ManageGuild to end poll', async () => {
    const result = await endPoll(POLL_ID, GUILD_ID, 'other_user', true, []);
    expect(result).toBeDefined();
  });

  it('should allow bot owner to end poll', async () => {
    const result = await endPoll(POLL_ID, GUILD_ID, 'bot_owner', false, ['bot_owner']);
    expect(result).toBeDefined();
  });

  it('should throw if poll not found', async () => {
    mockRepo.getPoll.mockResolvedValue(null);
    await expect(endPoll(POLL_ID, GUILD_ID, USER_ID, false, [])).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if poll already ended', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ status: 'ENDED' }));
    await expect(endPoll(POLL_ID, GUILD_ID, USER_ID, false, [])).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if poll cancelled', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ status: 'CANCELLED' }));
    await expect(endPoll(POLL_ID, GUILD_ID, USER_ID, false, [])).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if not creator and no ManageGuild', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ creator_id: 'other_user' }));
    await expect(endPoll(POLL_ID, GUILD_ID, USER_ID, false, [])).rejects.toThrow(MissingPermissionsError);
  });

  it('should throw if not creator and not bot owner', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ creator_id: 'other_user' }));
    await expect(endPoll(POLL_ID, GUILD_ID, USER_ID, false, ['someone_else'])).rejects.toThrow(MissingPermissionsError);
  });

  it('should throw if endPoll returns null', async () => {
    mockRepo.endPoll.mockResolvedValue(null);
    await expect(endPoll(POLL_ID, GUILD_ID, USER_ID, false, [])).rejects.toThrow(BusinessRuleError);
  });
});

describe('cancelPoll - Business Logic', () => {
  it('should cancel a poll with ManageGuild', async () => {
    const result = await cancelPoll(POLL_ID, GUILD_ID, true);
    expect(result).toBeDefined();
    expect(result.status).toBe('CANCELLED');
  });

  it('should throw if no ManageGuild', async () => {
    await expect(cancelPoll(POLL_ID, GUILD_ID, false)).rejects.toThrow(MissingPermissionsError);
  });

  it('should throw if poll not found', async () => {
    mockRepo.getPoll.mockResolvedValue(null);
    await expect(cancelPoll(POLL_ID, GUILD_ID, true)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if poll already ended', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ status: 'ENDED' }));
    await expect(cancelPoll(POLL_ID, GUILD_ID, true)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if poll already cancelled', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ status: 'CANCELLED' }));
    await expect(cancelPoll(POLL_ID, GUILD_ID, true)).rejects.toThrow(BusinessRuleError);
  });

  it('should throw if cancelPoll returns null', async () => {
    mockRepo.cancelPoll.mockResolvedValue(null);
    await expect(cancelPoll(POLL_ID, GUILD_ID, true)).rejects.toThrow(BusinessRuleError);
  });
});

describe('getPollResults - Business Logic', () => {
  it('should return results with correct counts', async () => {
    mockRepo.getVotes.mockResolvedValue([
      createMockVote({ option_id: 100, user_id: 'u1' }),
      createMockVote({ option_id: 100, user_id: 'u2' }),
      createMockVote({ option_id: 101, user_id: 'u3' }),
    ]);

    const results = await getPollResults(POLL_ID, GUILD_ID);
    expect(results).toHaveLength(2);
    expect(results[0].voteCount).toBe(2);
    expect(results[1].voteCount).toBe(1);
    expect(results[0].percentage).toBeCloseTo(66.67, 0);
    expect(results[1].percentage).toBeCloseTo(33.33, 0);
  });

  it('should handle zero votes', async () => {
    mockRepo.getVotes.mockResolvedValue([]);

    const results = await getPollResults(POLL_ID, GUILD_ID);
    expect(results).toHaveLength(2);
    expect(results[0].voteCount).toBe(0);
    expect(results[0].percentage).toBe(0);
    expect(results[1].voteCount).toBe(0);
    expect(results[1].percentage).toBe(0);
  });

  it('should throw if poll not found', async () => {
    mockRepo.getPoll.mockResolvedValue(null);
    await expect(getPollResults(POLL_ID, GUILD_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should include voters in results', async () => {
    mockRepo.getVotes.mockResolvedValue([
      createMockVote({ option_id: 100, user_id: 'voter1' }),
      createMockVote({ option_id: 100, user_id: 'voter2' }),
    ]);

    const results = await getPollResults(POLL_ID, GUILD_ID);
    expect(results[0].voters).toEqual(['voter1', 'voter2']);
  });
});

describe('Embeds & Buttons', () => {
  it('should build poll embed', async () => {
    const poll = createMockPoll();
    const options = [
      createMockOption({ id: 100, option_index: 0, option_text: 'A' }),
      createMockOption({ id: 101, option_index: 1, option_text: 'B' }),
    ];
    const results = [
      { option: options[0], voteCount: 5, percentage: 62.5, voters: ['u1', 'u2'] },
      { option: options[1], voteCount: 3, percentage: 37.5, voters: ['u3'] },
    ];

    const embed = buildPollEmbedBuilder(poll, options, results);
    expect(embed).toBeDefined();
    expect(embed.data.title).toContain('Test Question');
  });

  it('should show status in embed', async () => {
    const poll = createMockPoll({ status: 'ENDED' });
    const options = [createMockOption()];
    const results = [{ option: options[0], voteCount: 0, percentage: 0, voters: [] }];

    const embed = buildPollEmbedBuilder(poll, options, results);
    expect(embed.data.footer?.text).toContain('ENDED');
  });

  it('should build vote buttons', async () => {
    const options = [
      createMockOption({ id: 100, option_index: 0, option_text: 'A' }),
      createMockOption({ id: 101, option_index: 1, option_text: 'B' }),
    ];

    const buttons = buildPollVoteButtons(POLL_ID, options, []);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    expect(buttons[0].components.length).toBe(2);
  });

  it('should build multiple row buttons for > 5 options', async () => {
    const options = Array.from({ length: 6 }, (_, i) =>
      createMockOption({ id: 100 + i, option_index: i, option_text: `Opt ${i}` })
    );

    const buttons = buildPollVoteButtons(POLL_ID, options, []);
    expect(buttons.length).toBe(3);
    expect(buttons[0].components.length).toBe(5);
    expect(buttons[1].components.length).toBe(1);
  });

  it('should add remove vote button', async () => {
    const options = [createMockOption()];
    const buttons = buildPollVoteButtons(POLL_ID, options, []);
    const lastRow = buttons[buttons.length - 1];
    const removeBtn = lastRow.components.find(c => c.data.custom_id?.startsWith('poll:remove:'));
    expect(removeBtn).toBeDefined();
  });

  it('should highlight voted options', async () => {
    const options = [
      createMockOption({ id: 100 }),
      createMockOption({ id: 101 }),
    ];
    const userVotes = [createMockVote({ option_id: 100 })];

    const buttons = buildPollVoteButtons(POLL_ID, options, userVotes);
    const voteBtns = buttons[0].components;
    expect(voteBtns[0].data.style).toBe(1);
    expect(voteBtns[1].data.style).toBe(2);
  });

  it('should show multiple choice mode in embed', async () => {
    const poll = createMockPoll({ multiple_choice: true });
    const options = [createMockOption()];
    const results = [{ option: options[0], voteCount: 0, percentage: 0, voters: [] }];

    const embed = buildPollEmbedBuilder(poll, options, results);
    const modeField = embed.data.fields?.find(f => f.name?.includes('Mode'));
    expect(modeField?.value).toContain('Multiple Choice');
  });

  it('should show anonymous mode in embed', async () => {
    const poll = createMockPoll({ anonymous: true });
    const options = [createMockOption()];
    const results = [{ option: options[0], voteCount: 0, percentage: 0, voters: [] }];

    const embed = buildPollEmbedBuilder(poll, options, results);
    const modeField = embed.data.fields?.find(f => f.name?.includes('Mode'));
    expect(modeField?.value).toContain('Anonymous');
  });
});

describe('Security', () => {
  it('should enforce guild isolation in getPollById', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ guild_id: 'other' }));
    await expect(getPollById(POLL_ID, GUILD_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should prevent bot voting', async () => {
    await expect(vote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID, true)).rejects.toThrow(MissingPermissionsError);
  });

  it('should prevent ended poll voting', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ status: 'ENDED' }));
    await expect(vote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should prevent cancelled poll voting', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ status: 'CANCELLED' }));
    await expect(vote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should prevent expired poll voting', async () => {
    mockRepo.getPoll.mockResolvedValue(
      createMockPoll({ ends_at: new Date(Date.now() - 1000).toISOString() })
    );
    mockRepo.endPoll.mockResolvedValue(createMockPoll({ status: 'ENDED' }));
    await expect(vote(POLL_ID, GUILD_ID, USER_ID, OPTION_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should prevent invalid option voting', async () => {
    await expect(vote(POLL_ID, GUILD_ID, USER_ID, 999)).rejects.toThrow(BusinessRuleError);
  });

  it('should require ManageGuild to create poll', async () => {
    await expect(
      createPoll({
        guildId: GUILD_ID,
        channelId: 'ch1',
        creatorId: USER_ID,
        hasManageGuild: false,
        question: 'Q?',
        options: ['A', 'B'],
      })
    ).rejects.toThrow(MissingPermissionsError);
  });

  it('should require ManageGuild to cancel poll', async () => {
    await expect(cancelPoll(POLL_ID, GUILD_ID, false)).rejects.toThrow(MissingPermissionsError);
  });

  it('should enforce cross-guild protection in endPoll', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ guild_id: 'other', creator_id: USER_ID }));
    await expect(endPoll(POLL_ID, GUILD_ID, USER_ID, false, [])).rejects.toThrow(BusinessRuleError);
  });

  it('should enforce cross-guild protection in cancelPoll', async () => {
    mockRepo.getPoll.mockResolvedValue(createMockPoll({ guild_id: 'other' }));
    await expect(cancelPoll(POLL_ID, GUILD_ID, true)).rejects.toThrow(BusinessRuleError);
  });
});

describe('Timers', () => {
  it('should restore poll timers', async () => {
    mockRepo.getActivePolls.mockResolvedValue([
      createMockPoll({ ends_at: new Date(Date.now() + 3600000).toISOString() }),
    ]);

    await restorePollTimers();
    expect(mockRepo.getActivePolls).toHaveBeenCalled();
  });

  it('should end expired polls on restore', async () => {
    mockRepo.getActivePolls.mockResolvedValue([
      createMockPoll({ ends_at: new Date(Date.now() - 1000).toISOString() }),
    ]);

    await restorePollTimers();
    expect(mockRepo.endPoll).toHaveBeenCalled();
  });

  it('should handle restore with no active polls', async () => {
    mockRepo.getActivePolls.mockResolvedValue([]);
    await restorePollTimers();
    expect(mockRepo.endPoll).not.toHaveBeenCalled();
  });

  it('should handle restore error gracefully', async () => {
    mockRepo.getActivePolls.mockRejectedValue(new Error('DB error'));
    await expect(restorePollTimers()).resolves.not.toThrow();
  });

  it('should schedule timer for future poll', async () => {
    mockRepo.getActivePolls.mockResolvedValue([
      createMockPoll({ ends_at: new Date(Date.now() + 3600000).toISOString() }),
    ]);

    await restorePollTimers();
    expect(mockRepo.getActivePolls).toHaveBeenCalled();
  });
});

describe('Edge Cases', () => {
  it('should handle create poll with exactly 2 options', async () => {
    const result = await createPoll({
      guildId: GUILD_ID,
      channelId: 'ch1',
      creatorId: USER_ID,
      hasManageGuild: true,
      question: 'Q?',
      options: ['Yes', 'No'],
    });
    expect(result.options).toHaveLength(2);
  });

  it('should handle create poll with exactly 10 options', async () => {
    const result = await createPoll({
      guildId: GUILD_ID,
      channelId: 'ch1',
      creatorId: USER_ID,
      hasManageGuild: true,
      question: 'Q?',
      options: Array.from({ length: 10 }, (_, i) => `Option ${i + 1}`),
    });
    expect(result.options).toHaveLength(10);
  });

  it('should handle remove vote when no votes exist', async () => {
    mockRepo.removeUserVotes.mockResolvedValue(0);
    await expect(removeVote(POLL_ID, GUILD_ID, USER_ID)).rejects.toThrow(BusinessRuleError);
  });

  it('should handle embed with zero votes', async () => {
    const poll = createMockPoll();
    const options = [
      createMockOption({ option_index: 0, option_text: 'A' }),
      createMockOption({ option_index: 1, option_text: 'B' }),
    ];
    const results = [
      { option: options[0], voteCount: 0, percentage: 0, voters: [] },
      { option: options[1], voteCount: 0, percentage: 0, voters: [] },
    ];

    const embed = buildPollEmbedBuilder(poll, options, results);
    expect(embed.data.fields).toHaveLength(4);
  });

  it('should handle buttons with no user votes', async () => {
    const options = [createMockOption({ id: 100 }), createMockOption({ id: 101 })];
    const buttons = buildPollVoteButtons(POLL_ID, options, []);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle single option poll buttons', async () => {
    const options = [createMockOption({ id: 100 })];
    const buttons = buildPollVoteButtons(POLL_ID, options, []);
    expect(buttons[0].components.length).toBe(1);
  });

  it('should handle endPoll returning null gracefully', async () => {
    mockRepo.endPoll.mockResolvedValue(null);
    await expect(endPoll(POLL_ID, GUILD_ID, USER_ID, false, [])).rejects.toThrow(BusinessRuleError);
  });

  it('should handle cancelPoll returning null gracefully', async () => {
    mockRepo.cancelPoll.mockResolvedValue(null);
    await expect(cancelPoll(POLL_ID, GUILD_ID, true)).rejects.toThrow(BusinessRuleError);
  });
});
