import { describe, it, expect } from 'vitest';
import { parseDuration, formatDuration, formatDurationLong, isTimeoutDuration } from '../src/utils/duration';

describe('parseDuration', () => {
  it('should parse seconds', () => {
    const result = parseDuration('30s');
    expect(result.valid).toBe(true);
    expect(result.milliseconds).toBe(30000);
    expect(result.display).toBe('30 seconds');
  });

  it('should parse minutes', () => {
    const result = parseDuration('10m');
    expect(result.valid).toBe(true);
    expect(result.milliseconds).toBe(600000);
    expect(result.display).toBe('10 minutes');
  });

  it('should parse hours', () => {
    const result = parseDuration('1h');
    expect(result.valid).toBe(true);
    expect(result.milliseconds).toBe(3600000);
    expect(result.display).toBe('1 hour');
  });

  it('should parse days', () => {
    const result = parseDuration('7d');
    expect(result.valid).toBe(true);
    expect(result.milliseconds).toBe(604800000);
    expect(result.display).toBe('7 days');
  });

  it('should be case insensitive', () => {
    const result = parseDuration('10M');
    expect(result.valid).toBe(true);
    expect(result.milliseconds).toBe(600000);
  });

  it('should trim whitespace', () => {
    const result = parseDuration('  30s  ');
    expect(result.valid).toBe(true);
    expect(result.milliseconds).toBe(30000);
  });

  it('should reject invalid format', () => {
    const result = parseDuration('abc');
    expect(result.valid).toBe(false);
  });

  it('should reject empty string', () => {
    const result = parseDuration('');
    expect(result.valid).toBe(false);
  });

  it('should reject zero duration', () => {
    const result = parseDuration('0s');
    expect(result.valid).toBe(false);
  });

  it('should use singular for 1 unit', () => {
    const result = parseDuration('1s');
    expect(result.display).toBe('1 second');
  });

  it('should use plural for multiple units', () => {
    const result = parseDuration('5s');
    expect(result.display).toBe('5 seconds');
  });

  it('should reject durations > 28 days', () => {
    const result = parseDuration('29d');
    expect(result.valid).toBe(false);
  });

  it('should accept 28 days', () => {
    const result = parseDuration('28d');
    expect(result.valid).toBe(true);
  });
});

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(5000)).toBe('5s');
  });

  it('should format minutes', () => {
    expect(formatDuration(120000)).toBe('2m');
  });

  it('should format hours', () => {
    expect(formatDuration(3600000)).toBe('1h');
  });

  it('should format days', () => {
    expect(formatDuration(172800000)).toBe('2d');
  });

  it('should format weeks', () => {
    expect(formatDuration(604800000)).toBe('1w');
  });

  it('should format combined values', () => {
    const ms = 86400000 + 3600000 + 120000;
    const result = formatDuration(ms);
    expect(result).toContain('1d');
    expect(result).toContain('1h');
    expect(result).toContain('2m');
  });

  it('should return 0s for zero', () => {
    expect(formatDuration(0)).toBe('0s');
  });
});

describe('formatDurationLong', () => {
  it('should format verbose seconds', () => {
    expect(formatDurationLong(5000)).toBe('5 seconds');
  });

  it('should format verbose singular', () => {
    expect(formatDurationLong(3600000)).toBe('1 hour');
  });
});

describe('isTimeoutDuration', () => {
  it('should accept valid timeout', () => {
    expect(isTimeoutDuration(60000)).toBe(true);
  });

  it('should reject zero', () => {
    expect(isTimeoutDuration(0)).toBe(false);
  });

  it('should reject > 28 days', () => {
    expect(isTimeoutDuration(29 * 86400000)).toBe(false);
  });

  it('should accept exactly 28 days', () => {
    expect(isTimeoutDuration(28 * 86400000)).toBe(true);
  });
});
