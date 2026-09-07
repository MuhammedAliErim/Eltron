import { describe, it, expect } from 'vitest';
import { Cache } from '../src/utils/cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>(1000);
  });

  describe('has()', () => {
    it('should return true for existing key', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existing key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired key without side effect on get', () => {
      cache.set('key1', 'value1', 1); // 1ms TTL

      // Wait for expiration
      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait
      }

      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBe(null);
    });

    it('should not delete expired entry as side effect', () => {
      cache.set('key1', 'value1', 1);

      const start = Date.now();
      while (Date.now() - start < 10) {}

      // has() should detect expiration and clean up
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('get()', () => {
    it('should return value for existing key', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existing key', () => {
      expect(cache.get('nonexistent')).toBe(null);
    });

    it('should return null and delete expired entry', () => {
      cache.set('key1', 'value1', 1);

      const start = Date.now();
      while (Date.now() - start < 10) {}

      expect(cache.get('key1')).toBe(null);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('set()', () => {
    it('should store value with default TTL', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should store value with custom TTL', () => {
      cache.set('key1', 'value1', 5000);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should overwrite existing value', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('delete()', () => {
    it('should delete existing key', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBe(null);
    });

    it('should return false for non-existing key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('size', () => {
    it('should track entry count', () => {
      expect(cache.size).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
      cache.delete('key1');
      expect(cache.size).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should start and stop cleanup interval', () => {
      cache.startCleanup(100);
      cache.stopCleanup();
      // No error means success
    });

    it('should not start cleanup twice', () => {
      cache.startCleanup(100);
      cache.startCleanup(100); // should be no-op
      cache.stopCleanup();
    });

    it('should clean expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 50000);
      cache.startCleanup(100);

      await new Promise((r) => setTimeout(r, 150));

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);

      cache.stopCleanup();
    });
  });
});
