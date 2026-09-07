import { describe, it, expect } from 'vitest';
import { BOT_OWNERS, DEFAULT_LANGUAGE, DEFAULT_TIMEZONE, SUPPORTED_LANGUAGES } from '../src/config/bot';

describe('bot config', () => {
  it('should have DEFAULT_LANGUAGE set', () => {
    expect(DEFAULT_LANGUAGE).toBe('tr');
  });

  it('should have DEFAULT_TIMEZONE set', () => {
    expect(DEFAULT_TIMEZONE).toBe('Europe/Istanbul');
  });

  it('should have SUPPORTED_LANGUAGES array', () => {
    expect(SUPPORTED_LANGUAGES).toContain('tr');
    expect(SUPPORTED_LANGUAGES).toContain('en');
    expect(SUPPORTED_LANGUAGES).toContain('de');
  });

  it('BOT_OWNERS should be an array', () => {
    expect(Array.isArray(BOT_OWNERS)).toBe(true);
  });
});
