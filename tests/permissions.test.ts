import { describe, it, expect } from 'vitest';
import { PermissionGuard } from '../src/middleware/PermissionGuard';
import { BOT_OWNERS } from '../src/config/bot';

describe('PermissionGuard', () => {
  describe('isBotOwner', () => {
    it('should return true for configured owners', () => {
      if (BOT_OWNERS.length > 0) {
        expect(PermissionGuard.isBotOwner(BOT_OWNERS[0])).toBe(true);
      }
    });

    it('should return false for non-owners', () => {
      expect(PermissionGuard.isBotOwner('999999999999999999')).toBe(false);
    });

    it('should return false when no owners configured', () => {
      expect(PermissionGuard.isBotOwner('anyone')).toBe(false);
    });
  });
});
