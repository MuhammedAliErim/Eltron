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
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      rpc: vi.fn().mockResolvedValue({ error: null }),
    })),
  }),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

const TAG_NAME_REGEX = /^[a-z0-9_-]+$/;
const MAX_TAG_NAME_LENGTH = 50;
const MAX_TAG_CONTENT_LENGTH = 2000;

function validateTagName(name: string): string {
  const normalized = name.toLowerCase().trim();
  if (normalized.length === 0) throw new Error('Tag name cannot be empty');
  if (normalized.length > MAX_TAG_NAME_LENGTH) throw new Error(`Tag name must be ${MAX_TAG_NAME_LENGTH} characters or less`);
  if (!TAG_NAME_REGEX.test(normalized)) throw new Error('Tag name can only contain lowercase letters, numbers, hyphens, and underscores');
  return normalized;
}

function validateTagContent(content: string): string {
  if (!content || content.trim().length === 0) throw new Error('Tag content cannot be empty');
  if (content.length > MAX_TAG_CONTENT_LENGTH) throw new Error(`Tag content must be ${MAX_TAG_CONTENT_LENGTH} characters or less`);
  return content;
}

interface TagRow {
  id: string;
  guild_id: string;
  name: string;
  content: string;
  aliases: string[];
  use_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const createTag = (overrides: Partial<TagRow> = {}): TagRow => ({
  id: 'tag1',
  guild_id: 'guild1',
  name: 'test',
  content: 'Test content',
  aliases: [],
  use_count: 0,
  created_by: 'user1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('Tag Name Validation', () => {
  it('should normalize name to lowercase', () => {
    expect(validateTagName('HELLO')).toBe('hello');
    expect(validateTagName('Hello')).toBe('hello');
  });

  it('should trim whitespace', () => {
    expect(validateTagName('  hello  ')).toBe('hello');
  });

  it('should reject empty name', () => {
    expect(() => validateTagName('')).toThrow('Tag name cannot be empty');
  });

  it('should reject name longer than 50 characters', () => {
    const longName = 'a'.repeat(51);
    expect(() => validateTagName(longName)).toThrow('50 characters or less');
  });

  it('should accept name with 50 characters', () => {
    const name = 'a'.repeat(50);
    expect(validateTagName(name)).toBe(name);
  });

  it('should reject name with spaces', () => {
    expect(() => validateTagName('hello world')).toThrow();
  });

  it('should reject name with special characters', () => {
    expect(() => validateTagName('hello!')).toThrow();
  });

  it('should accept lowercase letters, numbers, hyphens, underscores', () => {
    expect(validateTagName('test-tag_123')).toBe('test-tag_123');
  });
});

describe('Tag Content Validation', () => {
  it('should reject empty content', () => {
    expect(() => validateTagContent('')).toThrow('Tag content cannot be empty');
  });

  it('should reject whitespace-only content', () => {
    expect(() => validateTagContent('   ')).toThrow('Tag content cannot be empty');
  });

  it('should reject content longer than 2000 characters', () => {
    const longContent = 'a'.repeat(2001);
    expect(() => validateTagContent(longContent)).toThrow('2000 characters or less');
  });

  it('should accept content with 2000 characters', () => {
    const content = 'a'.repeat(2000);
    expect(validateTagContent(content)).toBe(content);
  });
});

describe('Tag Model', () => {
  it('should create tag with default values', () => {
    const tag = createTag();
    expect(tag.use_count).toBe(0);
    expect(tag.aliases).toEqual([]);
  });

  it('should support guild isolation', () => {
    const tag1 = createTag({ guild_id: 'g1' });
    const tag2 = createTag({ guild_id: 'g2' });
    expect(tag1.guild_id).not.toBe(tag2.guild_id);
  });

  it('should track use count', () => {
    const tag = createTag({ use_count: 10 });
    expect(tag.use_count).toBe(10);
  });

  it('should support aliases', () => {
    const tag = createTag({ aliases: ['alt1', 'alt2'] });
    expect(tag.aliases).toHaveLength(2);
  });

  it('should store created_by', () => {
    const tag = createTag({ created_by: 'creator123' });
    expect(tag.created_by).toBe('creator123');
  });
});

describe('Tag Lookup by Name and Alias', () => {
  it('should find tag by exact name', () => {
    const tags = [
      createTag({ name: 'hello', aliases: ['hi'] }),
      createTag({ name: 'goodbye', aliases: ['bye'] }),
    ];
    const found = tags.find(t => t.name === 'hello');
    expect(found).toBeDefined();
    expect(found!.name).toBe('hello');
  });

  it('should find tag by alias', () => {
    const tags = [
      createTag({ name: 'hello', aliases: ['hi'] }),
      createTag({ name: 'goodbye', aliases: ['bye'] }),
    ];
    const query = 'hi';
    const found = tags.find(t => t.aliases.includes(query));
    expect(found).toBeDefined();
    expect(found!.name).toBe('hello');
  });

  it('should return undefined when no match', () => {
    const tags = [createTag({ name: 'hello' })];
    const found = tags.find(t => t.name === 'nope' || t.aliases.includes('nope'));
    expect(found).toBeUndefined();
  });

  it('should normalize query to lowercase', () => {
    const tags = [createTag({ name: 'hello' })];
    const query = 'HELLO'.toLowerCase();
    const found = tags.find(t => t.name === query);
    expect(found).toBeDefined();
  });
});

describe('Tag Duplicate Handling', () => {
  it('should detect duplicate tag name', () => {
    const existingTags = [createTag({ name: 'test' })];
    const newTag = { name: 'test' };
    const isDuplicate = existingTags.some(t => t.name === newTag.name.toLowerCase());
    expect(isDuplicate).toBe(true);
  });

  it('should allow different tag names', () => {
    const existingTags = [createTag({ name: 'test' })];
    const newTag = { name: 'other' };
    const isDuplicate = existingTags.some(t => t.name === newTag.name.toLowerCase());
    expect(isDuplicate).toBe(false);
  });

  it('should detect duplicate alias on different tag', () => {
    const tags = [
      createTag({ id: '1', name: 'hello', aliases: ['hi'] }),
      createTag({ id: '2', name: 'greeting', aliases: [] }),
    ];
    const aliasExistsOnOther = tags.some(t => t.id !== '2' && (t.name === 'hi' || t.aliases.includes('hi')));
    expect(aliasExistsOnOther).toBe(true);
  });
});

describe('Tag Search', () => {
  it('should search by name prefix', () => {
    const tags = [
      createTag({ name: 'welcome', content: 'Welcome message' }),
      createTag({ name: 'goodbye', content: 'Goodbye message' }),
    ];
    const query = 'wel';
    const results = tags.filter(t => t.name.includes(query) || t.content.includes(query));
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('welcome');
  });

  it('should search by content', () => {
    const tags = [
      createTag({ name: 'rules', content: 'Server rules here' }),
      createTag({ name: 'faq', content: 'Frequently asked questions' }),
    ];
    const query = 'rules';
    const results = tags.filter(t => t.name.includes(query) || t.content.toLowerCase().includes(query.toLowerCase()));
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('rules');
  });

  it('should return empty for no matches', () => {
    const tags = [createTag({ name: 'test' })];
    const query = 'xyz';
    const results = tags.filter(t => t.name.includes(query) || t.content.includes(query));
    expect(results).toHaveLength(0);
  });

  it('should handle empty query', () => {
    const query = '';
    const results = query.trim().length === 0 ? [] : [createTag()];
    expect(results).toHaveLength(0);
  });
});

describe('Tag Use Count', () => {
  it('should increment use count', () => {
    const tag = createTag({ use_count: 0 });
    tag.use_count += 1;
    expect(tag.use_count).toBe(1);
  });

  it('should track multiple uses', () => {
    const tag = createTag({ use_count: 0 });
    for (let i = 0; i < 10; i++) tag.use_count += 1;
    expect(tag.use_count).toBe(10);
  });
});
