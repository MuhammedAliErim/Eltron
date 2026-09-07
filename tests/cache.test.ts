import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Cache } from '../src/utils/cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>(1000);
  });

  afterEach(() => {
    cache.stopCleanup();
    cache.clear();
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return null for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should return null for expired entries', async () => {
    cache.set('key1', 'value1', 50);
    await new Promise((r) => setTimeout(r, 100));
    expect(cache.get('key1')).toBeNull();
  });

  it('should delete entries', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('should report size correctly', () => {
    expect(cache.size).toBe(0);
    cache.set('key1', 'value1');
    expect(cache.size).toBe(1);
  });

  it('should use default TTL', async () => {
    const shortCache = new Cache<string>(100);
    shortCache.set('key1', 'value1');
    expect(shortCache.get('key1')).toBe('value1');
    await new Promise((r) => setTimeout(r, 150));
    expect(shortCache.get('key1')).toBeNull();
    shortCache.stopCleanup();
  });

  it('should use custom TTL per entry', async () => {
    cache.set('short', 'value', 50);
    cache.set('long', 'value', 5000);
    await new Promise((r) => setTimeout(r, 100));
    expect(cache.get('short')).toBeNull();
    expect(cache.get('long')).toBe('value');
  });

  it('should start and stop cleanup', () => {
    cache.startCleanup(1000);
    cache.startCleanup(1000);
    cache.stopCleanup();
    cache.stopCleanup();
  });
});
