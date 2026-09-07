import { describe, it, expect } from 'vitest';
import { snowflakeSchema, guildIdSchema, userIdSchema } from '../src/utils/validation';

describe('Snowflake Validation', () => {
  it('should accept valid 17-digit snowflake', () => {
    expect(snowflakeSchema.safeParse('12345678901234567').success).toBe(true);
  });

  it('should accept valid 18-digit snowflake', () => {
    expect(snowflakeSchema.safeParse('123456789012345678').success).toBe(true);
  });

  it('should accept valid 19-digit snowflake', () => {
    expect(snowflakeSchema.safeParse('1234567890123456789').success).toBe(true);
  });

  it('should accept valid 20-digit snowflake', () => {
    expect(snowflakeSchema.safeParse('12345678901234567890').success).toBe(true);
  });

  it('should reject 16-digit string', () => {
    expect(snowflakeSchema.safeParse('1234567890123456').success).toBe(false);
  });

  it('should reject 21-digit string', () => {
    expect(snowflakeSchema.safeParse('123456789012345678901').success).toBe(false);
  });

  it('should reject non-numeric strings', () => {
    expect(snowflakeSchema.safeParse('abcdefghijklmnopq').success).toBe(false);
  });

  it('should reject empty string', () => {
    expect(snowflakeSchema.safeParse('').success).toBe(false);
  });

  it('should reject strings with special characters', () => {
    expect(snowflakeSchema.safeParse('12345678901234567!').success).toBe(false);
  });

  it('guildIdSchema should behave identically to snowflakeSchema', () => {
    expect(guildIdSchema.safeParse('12345678901234567890').success).toBe(true);
    expect(guildIdSchema.safeParse('1234567890123456').success).toBe(false);
  });

  it('userIdSchema should behave identically to snowflakeSchema', () => {
    expect(userIdSchema.safeParse('12345678901234567890').success).toBe(true);
    expect(userIdSchema.safeParse('1234567890123456').success).toBe(false);
  });
});
