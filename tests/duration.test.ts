import { describe, it, expect } from 'vitest';
import { parseDuration, formatDuration, isTimeoutDuration } from '../src/utils/duration';

describe('parseDuration', () => {
  it('should parse seconds', () => {
    const result = parseDuration('30s');
    expect(result.valid).toBe(true);
    expect(result.milliseconds).toBe(30000);
    expect(result.display).toBe('30s');
  });

  it('should parse minutes', () => {
    const result = parseDuration('10m');
    expect(result.valid).toBe(true);
    expect(result.milliseconds).toBe(600000);
    expect(result.display).toBe('10m');
  });

  it('should parse hours', () => {
    const result = parseDuration('1h');
    expect(result.valid).toBe(true);
    expect(result.milliseconds).toBe(3600000);
    expect(result.display).toBe('1h');
  });

  it('should parse days', () => {
    const result = parseDuration('7d');
    expect(result.valid).toBe(true);
    expect(result.milliseconds).toBe(604800000);
    expect(result.display).toBe('7d');
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
    expect(result.error).toBeDefined();
  });

  it('should reject duration exceeding 28 days', () => {
    const result = parseDuration('29d');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('28 days');
  });

  it('should reject zero duration', () => {
    const result = parseDuration('0s');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('greater than 0');
  });

  it('should reject numeric without unit', () => {
    const result = parseDuration('30');
    expect(result.valid).toBe(false);
  });
});

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(30000)).toBe('30s');
  });

  it('should format minutes', () => {
    expect(formatDuration(600000)).toBe('10m');
  });

  it('should format hours', () => {
    expect(formatDuration(3600000)).toBe('1h');
  });

  it('should format days', () => {
    expect(formatDuration(604800000)).toBe('7d');
  });

  it('should format complex duration', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
  });
});

describe('isTimeoutDuration', () => {
  it('should accept valid timeout', () => {
    expect(isTimeoutDuration(60000)).toBe(true);
  });

  it('should accept max 28 days', () => {
    expect(isTimeoutDuration(28 * 24 * 60 * 60 * 1000)).toBe(true);
  });

  it('should reject over 28 days', () => {
    expect(isTimeoutDuration(29 * 24 * 60 * 60 * 1000)).toBe(false);
  });

  it('should reject zero', () => {
    expect(isTimeoutDuration(0)).toBe(false);
  });

  it('should reject negative', () => {
    expect(isTimeoutDuration(-1)).toBe(false);
  });
});
