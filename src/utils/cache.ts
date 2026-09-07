interface CacheEntry<T> {
  data: T;
  expires: number;
}

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTTLms = 60000) {
    this.defaultTTL = defaultTTLms;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      data,
      expires: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  get size(): number {
    return this.store.size;
  }

  *entries(): IterableIterator<[string, T]> {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now <= entry.expires) {
        yield [key, entry.data];
      }
    }
  }

  startCleanup(intervalMs = 300000): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (now > entry.expires) this.store.delete(key);
      }
    }, intervalMs);
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export interface GuildCacheData {
  guildId: string;
  name: string;
  ownerId: string;
  language: string;
  timezone: string;
  settings: Record<string, unknown>;
}

export const guildCache = new Cache<GuildCacheData>(120000);
