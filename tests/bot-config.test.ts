import { describe, it, expect } from 'vitest';
import { BOT_OWNERS } from '../src/config/bot';

describe('BOT_OWNERS', () => {
  it('should be an array', () => {
    expect(Array.isArray(BOT_OWNERS)).toBe(true);
  });

  it('should not contain empty strings', () => {
    for (const owner of BOT_OWNERS) {
      expect(owner.length).toBeGreaterThan(0);
    }
  });

  it('should not contain whitespace-only strings', () => {
    for (const owner of BOT_OWNERS) {
      expect(owner.trim()).toBe(owner);
    }
  });
});
