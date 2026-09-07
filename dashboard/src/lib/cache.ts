interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 30_000;

export function cacheGet<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function cacheSet<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function cacheInvalidate(key: string): void {
  cache.delete(key);
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function buildCacheKey(guildId: string, module: string, params?: string): string {
  return params ? `${guildId}:${module}:${params}` : `${guildId}:${module}`;
}
