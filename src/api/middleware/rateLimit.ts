import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(store: Map<string, RateLimitEntry>): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

function globalCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const store of stores.values()) {
    cleanup(store);
  }
}

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    globalCleanup();

    const storeKey = req.baseUrl || req.path;
    if (!stores.has(storeKey)) {
      stores.set(storeKey, new Map());
    }
    const store = stores.get(storeKey)!;

    const key = `${(req.session as any)?.user?.id || 'anonymous'}:${req.ip}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count++;
    if (entry.count > maxRequests) {
      sendError(res, 429, 'Too many requests', 'RATE_LIMITED');
      return;
    }

    next();
  };
}

export const rateLimits = {
  auth: rateLimit(10, 60_000),
  configPut: rateLimit(10, 60_000),
  normalGet: rateLimit(60, 60_000),
  analytics: rateLimit(30, 60_000),
};
