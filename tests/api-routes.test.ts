import { describe, it, expect, vi } from 'vitest';
import { Router, Response } from 'express';

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    })),
  }),
}));

vi.mock('../src/utils/logger', () => ({
  logError: vi.fn(),
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

function createMockRes(): Partial<Response> {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

describe('API Route Structure', () => {
  describe('moderation routes', () => {
    it('should export a router', { timeout: 15000 }, async () => {
      const mod = await import('../src/api/routes/moderation');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });
  });

  describe('automod routes', () => {
    it('should export a router', async () => {
      const mod = await import('../src/api/routes/automod');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });
  });

  describe('security routes', () => {
    it('should export a router', async () => {
      const sec = await import('../src/api/routes/security');
      expect(sec.default).toBeDefined();
      expect(typeof sec.default).toBe('function');
    });
  });

  describe('ticket routes', () => {
    it('should export a router', async () => {
      const tix = await import('../src/api/routes/tickets');
      expect(tix.default).toBeDefined();
      expect(typeof tix.default).toBe('function');
    });
  });

  describe('application routes', () => {
    it('should export a router', async () => {
      const app = await import('../src/api/routes/applications');
      expect(app.default).toBeDefined();
      expect(typeof app.default).toBe('function');
    });
  });

  describe('staff routes', () => {
    it('should export a router', async () => {
      const staff = await import('../src/api/routes/staff');
      expect(staff.default).toBeDefined();
      expect(typeof staff.default).toBe('function');
    });
  });

  describe('welcome routes', () => {
    it('should export a router', async () => {
      const welcome = await import('../src/api/routes/welcome');
      expect(welcome.default).toBeDefined();
      expect(typeof welcome.default).toBe('function');
    });
  });

  describe('roles routes', () => {
    it('should export a router', async () => {
      const roles = await import('../src/api/routes/roles');
      expect(roles.default).toBeDefined();
      expect(typeof roles.default).toBe('function');
    });
  });

  describe('leveling routes', () => {
    it('should export a router', async () => {
      const lvl = await import('../src/api/routes/leveling');
      expect(lvl.default).toBeDefined();
      expect(typeof lvl.default).toBe('function');
    });
  });

  describe('giveaway routes', () => {
    it('should export a router', async () => {
      const gw = await import('../src/api/routes/giveaways');
      expect(gw.default).toBeDefined();
      expect(typeof gw.default).toBe('function');
    });
  });

  describe('event routes', () => {
    it('should export a router', async () => {
      const ev = await import('../src/api/routes/events');
      expect(ev.default).toBeDefined();
      expect(typeof ev.default).toBe('function');
    });
  });

  describe('poll routes', () => {
    it('should export a router', async () => {
      const poll = await import('../src/api/routes/polls');
      expect(poll.default).toBeDefined();
      expect(typeof poll.default).toBe('function');
    });
  });

  describe('reminder routes', () => {
    it('should export a router', async () => {
      const rem = await import('../src/api/routes/reminders');
      expect(rem.default).toBeDefined();
      expect(typeof rem.default).toBe('function');
    });
  });

  describe('settings routes', () => {
    it('should export a router', async () => {
      const settings = await import('../src/api/routes/settings');
      expect(settings.default).toBeDefined();
      expect(typeof settings.default).toBe('function');
    });
  });
});

describe('API Route Middleware Presence', () => {
  function getRoutes(router: Router): { path: string; methods: string[] }[] {
    const routes: { path: string; methods: string[] }[] = [];
    router.stack.forEach((layer: Record<string, unknown>) => {
      if (layer.route) {
        const route = layer.route as { path: string; methods: Record<string, boolean> };
        routes.push({
          path: route.path,
          methods: Object.keys(route.methods).filter((m) => route.methods[m]),
        });
      }
    });
    return routes;
  }

  it('moderation routes should have 3 routes', async () => {
    const { default: router } = await import('../src/api/routes/moderation');
    const routes = getRoutes(router);
    expect(routes.length).toBe(3);
  });

  it('automod routes should have 3 routes', async () => {
    const { default: router } = await import('../src/api/routes/automod');
    const routes = getRoutes(router);
    expect(routes.length).toBe(3);
  });

  it('security routes should have 6 routes', async () => {
    const { default: router } = await import('../src/api/routes/security');
    const routes = getRoutes(router);
    expect(routes.length).toBe(6);
  });

  it('ticket routes should have 2 routes', async () => {
    const { default: router } = await import('../src/api/routes/tickets');
    const routes = getRoutes(router);
    expect(routes.length).toBe(2);
  });

  it('application routes should have 2 routes', async () => {
    const { default: router } = await import('../src/api/routes/applications');
    const routes = getRoutes(router);
    expect(routes.length).toBe(2);
  });

  it('staff routes should have 1 route', async () => {
    const { default: router } = await import('../src/api/routes/staff');
    const routes = getRoutes(router);
    expect(routes.length).toBe(1);
  });

  it('welcome routes should have 2 routes', async () => {
    const { default: router } = await import('../src/api/routes/welcome');
    const routes = getRoutes(router);
    expect(routes.length).toBe(2);
  });

  it('roles routes should have 2 routes', async () => {
    const { default: router } = await import('../src/api/routes/roles');
    const routes = getRoutes(router);
    expect(routes.length).toBe(2);
  });

  it('leveling routes should have 2 routes', async () => {
    const { default: router } = await import('../src/api/routes/leveling');
    const routes = getRoutes(router);
    expect(routes.length).toBe(2);
  });

  it('giveaway routes should have 2 routes', async () => {
    const { default: router } = await import('../src/api/routes/giveaways');
    const routes = getRoutes(router);
    expect(routes.length).toBe(2);
  });

  it('event routes should have 2 routes', async () => {
    const { default: router } = await import('../src/api/routes/events');
    const routes = getRoutes(router);
    expect(routes.length).toBe(2);
  });

  it('poll routes should have 2 routes', async () => {
    const { default: router } = await import('../src/api/routes/polls');
    const routes = getRoutes(router);
    expect(routes.length).toBe(2);
  });

  it('reminder routes should have 1 route', async () => {
    const { default: router } = await import('../src/api/routes/reminders');
    const routes = getRoutes(router);
    expect(routes.length).toBe(1);
  });

  it('settings routes should have 2 routes', async () => {
    const { default: router } = await import('../src/api/routes/settings');
    const routes = getRoutes(router);
    expect(routes.length).toBe(2);
  });
});

describe('Response Helpers', () => {
  it('parsePagination returns defaults for empty query', async () => {
    const { parsePagination } = await import('../src/api/utils/response');
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, pageSize: 20 });
  });

  it('parsePagination parses page and pageSize', async () => {
    const { parsePagination } = await import('../src/api/utils/response');
    const result = parsePagination({ page: '3', pageSize: '50' });
    expect(result).toEqual({ page: 3, pageSize: 50 });
  });

  it('parsePagination clamps pageSize to max 100', async () => {
    const { parsePagination } = await import('../src/api/utils/response');
    const result = parsePagination({ pageSize: '999' });
    expect(result.pageSize).toBe(100);
  });

  it('parsePagination treats 0 pageSize as default (20)', async () => {
    const { parsePagination } = await import('../src/api/utils/response');
    const result = parsePagination({ pageSize: '0' });
    expect(result.pageSize).toBe(20);
  });

  it('parsePagination clamps page to min 1', async () => {
    const { parsePagination } = await import('../src/api/utils/response');
    const result = parsePagination({ page: '-5' });
    expect(result.page).toBe(1);
  });

  it('buildPagination calculates totalPages', async () => {
    const { buildPagination } = await import('../src/api/utils/response');
    const result = buildPagination(55, { page: 1, pageSize: 20 });
    expect(result.totalPages).toBe(3);
    expect(result.total).toBe(55);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('sendList sends correct envelope', async () => {
    const { sendList } = await import('../src/api/utils/response');
    const res = createMockRes();
    sendList(res as Response, [{ id: 1 }], 1, { page: 1, pageSize: 20 });
    expect(res.json).toHaveBeenCalledWith({
      data: [{ id: 1 }],
      pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    });
  });

  it('sendData sends correct envelope', async () => {
    const { sendData } = await import('../src/api/utils/response');
    const res = createMockRes();
    sendData(res as Response, { id: 1 });
    expect(res.json).toHaveBeenCalledWith({ data: { id: 1 } });
  });

  it('sendError sends correct error envelope', async () => {
    const { sendError } = await import('../src/api/utils/response');
    const res = createMockRes();
    sendError(res as Response, 404, 'Not found', 'NOT_FOUND');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found', code: 'NOT_FOUND' });
  });

  it('sendError includes errorId when provided', async () => {
    const { sendError } = await import('../src/api/utils/response');
    const res = createMockRes();
    sendError(res as Response, 500, 'Error', 'ERR', 'abc-123');
    expect(res.json).toHaveBeenCalledWith({ error: 'Error', code: 'ERR', errorId: 'abc-123' });
  });
});

describe('Zod Validation', () => {
  it('validate middleware should be a function', async () => {
    const { validate } = await import('../src/api/middleware/validate');
    expect(typeof validate).toBe('function');
  });
});

describe('Rate Limiting', () => {
  it('rateLimits should have auth, configPut, normalGet, analytics', async () => {
    const { rateLimits } = await import('../src/api/middleware/rateLimit');
    expect(rateLimits).toBeDefined();
    expect(typeof rateLimits.auth).toBe('function');
    expect(typeof rateLimits.configPut).toBe('function');
    expect(typeof rateLimits.normalGet).toBe('function');
    expect(typeof rateLimits.analytics).toBe('function');
  });
});

describe('Middleware Functions', () => {
  it('requireAuth should be a function', async () => {
    const { requireAuth } = await import('../src/api/middleware/auth');
    expect(typeof requireAuth).toBe('function');
  });

  it('guildGuard should be a function', async () => {
    const { guildGuard } = await import('../src/api/middleware/guildGuard');
    expect(typeof guildGuard).toBe('function');
  });
});
