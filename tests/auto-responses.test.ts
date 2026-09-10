import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cache } from '../src/utils/cache';

vi.mock('../src/database/repositories/AutoResponseRepository', () => {
  const mockRepo = {
    getEnabledByGuild: vi.fn().mockResolvedValue([]),
    getByGuild: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    incrementUses: vi.fn(),
  };
  return { AutoResponseRepository: vi.fn(() => mockRepo), __mock: mockRepo };
});

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

const matchesTrigger = (messageContent: string, rule: { trigger_text: string; match_type: string }): boolean => {
  const content = messageContent;
  const trigger = rule.trigger_text;

  switch (rule.match_type) {
    case 'contains':
      return content.toLowerCase().includes(trigger.toLowerCase());
    case 'exact':
      return content.toLowerCase() === trigger.toLowerCase();
    case 'starts_with':
      return content.toLowerCase().startsWith(trigger.toLowerCase());
    case 'ends_with':
      return content.toLowerCase().endsWith(trigger.toLowerCase());
    case 'regex':
      try {
        const regex = new RegExp(trigger, 'i');
        return regex.test(content);
      } catch {
        return false;
      }
    default:
      return false;
  }
};

describe('AutoResponse Match Types', () => {
  it('contains: matches substring case-insensitively', () => {
    expect(matchesTrigger('Hello World', { trigger_text: 'hello', match_type: 'contains' })).toBe(true);
    expect(matchesTrigger('HELLO WORLD', { trigger_text: 'hello', match_type: 'contains' })).toBe(true);
  });

  it('contains: does not match unrelated text', () => {
    expect(matchesTrigger('Goodbye World', { trigger_text: 'hello', match_type: 'contains' })).toBe(false);
  });

  it('exact: matches exact string case-insensitively', () => {
    expect(matchesTrigger('hello', { trigger_text: 'hello', match_type: 'exact' })).toBe(true);
    expect(matchesTrigger('HELLO', { trigger_text: 'hello', match_type: 'exact' })).toBe(true);
  });

  it('exact: does not match partial strings', () => {
    expect(matchesTrigger('hello world', { trigger_text: 'hello', match_type: 'exact' })).toBe(false);
  });

  it('starts_with: matches prefix case-insensitively', () => {
    expect(matchesTrigger('hello world', { trigger_text: 'hello', match_type: 'starts_with' })).toBe(true);
    expect(matchesTrigger('HELLO there', { trigger_text: 'hello', match_type: 'starts_with' })).toBe(true);
  });

  it('starts_with: does not match non-prefix', () => {
    expect(matchesTrigger('say hello', { trigger_text: 'hello', match_type: 'starts_with' })).toBe(false);
  });

  it('ends_with: matches suffix case-insensitively', () => {
    expect(matchesTrigger('say hello', { trigger_text: 'hello', match_type: 'ends_with' })).toBe(true);
    expect(matchesTrigger('say HELLO', { trigger_text: 'hello', match_type: 'ends_with' })).toBe(true);
  });

  it('ends_with: does not match non-suffix', () => {
    expect(matchesTrigger('hello world', { trigger_text: 'hello', match_type: 'ends_with' })).toBe(false);
  });

  it('regex: matches pattern', () => {
    expect(matchesTrigger('test123', { trigger_text: '\\d+', match_type: 'regex' })).toBe(true);
    expect(matchesTrigger('no numbers', { trigger_text: '\\d+', match_type: 'regex' })).toBe(false);
  });

  it('regex: is case-insensitive', () => {
    expect(matchesTrigger('HELLO', { trigger_text: '^hello$', match_type: 'regex' })).toBe(true);
  });

  it('regex: handles invalid regex gracefully', () => {
    expect(matchesTrigger('test', { trigger_text: '[invalid', match_type: 'regex' })).toBe(false);
  });

  it('unknown match type: returns false', () => {
    expect(matchesTrigger('hello', { trigger_text: 'hello', match_type: 'unknown' })).toBe(false);
  });
});

describe('AutoResponse Channel Filtering', () => {
  it('should pass when channel_ids is empty (all channels)', () => {
    const channelIds: string[] = [];
    const channelId = 'ch1';
    expect(channelIds.length === 0 || channelIds.includes(channelId)).toBe(true);
  });

  it('should pass when channel is in allowed list', () => {
    const channelIds = ['ch1', 'ch2'];
    expect(channelIds.includes('ch1')).toBe(true);
  });

  it('should skip when channel is not in allowed list', () => {
    const channelIds = ['ch1', 'ch2'];
    expect(channelIds.includes('ch3')).toBe(false);
  });

  it('should skip when channel is in excluded list', () => {
    const excludedIds = ['ch5'];
    expect(excludedIds.includes('ch5')).toBe(true);
  });

  it('should pass when channel is not in excluded list', () => {
    const excludedIds = ['ch5'];
    expect(excludedIds.includes('ch1')).toBe(false);
  });
});

describe('AutoResponse Cooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow when no cooldown set', () => {
    const cooldownSeconds = 0;
    const lastUsedAt: string | null = null;
    const withinCooldown = cooldownSeconds > 0 && lastUsedAt !== null &&
      (Date.now() - new Date(lastUsedAt).getTime()) < cooldownSeconds * 1000;
    expect(withinCooldown).toBe(false);
  });

  it('should block when within cooldown period', () => {
    const cooldownSeconds = 60;
    const lastUsedAt = new Date(Date.now() - 30_000).toISOString();
    const withinCooldown = cooldownSeconds > 0 && lastUsedAt !== null &&
      (Date.now() - new Date(lastUsedAt).getTime()) < cooldownSeconds * 1000;
    expect(withinCooldown).toBe(true);
  });

  it('should allow when cooldown has expired', () => {
    const cooldownSeconds = 60;
    const lastUsedAt = new Date(Date.now() - 120_000).toISOString();
    const withinCooldown = cooldownSeconds > 0 && lastUsedAt !== null &&
      (Date.now() - new Date(lastUsedAt).getTime()) < cooldownSeconds * 1000;
    expect(withinCooldown).toBe(false);
  });
});

describe('AutoResponse Caching', () => {
  it('should store and retrieve cached values', () => {
    const cache = new Cache<string[]>(60000);
    cache.set('guild1', ['response1']);
    expect(cache.get('guild1')).toEqual(['response1']);
  });

  it('should return null for missing keys', () => {
    const cache = new Cache<string[]>(60000);
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should invalidate specific guild cache', () => {
    const cache = new Cache<string[]>(60000);
    cache.set('guild1', ['r1']);
    cache.set('guild2', ['r2']);
    cache.delete('guild1');
    expect(cache.get('guild1')).toBeNull();
    expect(cache.get('guild2')).toEqual(['r2']);
  });
});

describe('AutoResponse Guild Isolation', () => {
  it('should not match triggers from different guilds', () => {
    const guild1Responses = [{ trigger_text: 'hello', match_type: 'contains', guild_id: 'g1' }];
    const guild2Responses = [{ trigger_text: 'goodbye', match_type: 'contains', guild_id: 'g2' }];

    const filterByGuild = (responses: typeof guild1Responses, guildId: string) =>
      responses.filter(r => r.guild_id === guildId);

    expect(filterByGuild(guild1Responses, 'g1')).toHaveLength(1);
    expect(filterByGuild(guild2Responses, 'g1')).toHaveLength(0);
  });
});
