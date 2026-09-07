import { describe, it, expect } from 'vitest';
import { guildIdSchema, userIdSchema, languageSchema, snowflakeSchema } from '../src/utils/validation';

describe('snowflakeSchema', () => {
  it('should accept valid snowflake IDs', () => {
    expect(snowflakeSchema.safeParse('1545723966080163912').success).toBe(true);
    expect(snowflakeSchema.safeParse('123456789012345678').success).toBe(true);
  });

  it('should reject invalid snowflake IDs', () => {
    expect(snowflakeSchema.safeParse('abc').success).toBe(false);
    expect(snowflakeSchema.safeParse('12345').success).toBe(false);
    expect(snowflakeSchema.safeParse('').success).toBe(false);
  });
});

describe('guildIdSchema', () => {
  it('should accept valid guild IDs', () => {
    expect(guildIdSchema.safeParse('1545723966080163912').success).toBe(true);
  });

  it('should reject invalid guild IDs', () => {
    expect(guildIdSchema.safeParse('invalid').success).toBe(false);
  });
});

describe('userIdSchema', () => {
  it('should accept valid user IDs', () => {
    expect(userIdSchema.safeParse('1545723966080163912').success).toBe(true);
  });

  it('should reject invalid user IDs', () => {
    expect(userIdSchema.safeParse('short').success).toBe(false);
  });
});

describe('languageSchema', () => {
  it('should accept valid languages', () => {
    expect(languageSchema.safeParse('tr').success).toBe(true);
    expect(languageSchema.safeParse('en').success).toBe(true);
    expect(languageSchema.safeParse('de').success).toBe(true);
  });

  it('should reject invalid languages', () => {
    expect(languageSchema.safeParse('fr').success).toBe(false);
    expect(languageSchema.safeParse('').success).toBe(false);
  });
});
