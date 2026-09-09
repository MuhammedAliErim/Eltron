import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheGet, cacheSet, cacheInvalidate, cacheInvalidatePrefix, buildCacheKey } from '../dashboard/src/lib/cache';

describe('Cache System', () => {
  beforeEach(() => {
    cacheInvalidatePrefix('');
  });

  it('set and get cache entry', () => {
    cacheSet('test-key', { value: 42 });
    const result = cacheGet<{ value: number }>('test-key');
    expect(result).toEqual({ value: 42 });
  });

  it('returns null for missing key', () => {
    const result = cacheGet('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null for expired entry', () => {
    cacheSet('test-key', 'data');
    const result = cacheGet('test-key', -1);
    expect(result).toBeNull();
  });

  it('invalidate specific key', () => {
    cacheSet('key-a', 'a');
    cacheSet('key-b', 'b');
    cacheInvalidate('key-a');
    expect(cacheGet('key-a')).toBeNull();
    expect(cacheGet('key-b')).toBe('b');
  });

  it('invalidate prefix', () => {
    cacheSet('guild1:moderation:config', 'a');
    cacheSet('guild1:moderation:rules', 'b');
    cacheSet('guild1:tickets', 'c');
    cacheInvalidatePrefix('guild1:moderation');
    expect(cacheGet('guild1:moderation:config')).toBeNull();
    expect(cacheGet('guild1:moderation:rules')).toBeNull();
    expect(cacheGet('guild1:tickets')).toBe('c');
  });

  it('buildCacheKey without params', () => {
    const key = buildCacheKey('guild1', 'moderation');
    expect(key).toBe('guild1:moderation');
  });

  it('buildCacheKey with params', () => {
    const key = buildCacheKey('guild1', 'tickets', '{"status":"OPEN"}');
    expect(key).toBe('guild1:tickets:{"status":"OPEN"}');
  });
});

describe('API Client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('api.auth.me calls correct endpoint', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: '1', username: 'test', discriminator: '0', global_name: null, avatar: null } }),
    } as Response);

    const { api } = await import('../dashboard/src/api/client');
    const result = await api.auth.me();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(result.user.id).toBe('1');
  });

  it('api.guilds.list calls correct endpoint', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ guilds: [{ id: 'g1', name: 'Test', icon: null, owner: false, hasBot: true }] }),
    } as Response);

    const { api } = await import('../dashboard/src/api/client');
    const result = await api.guilds.list();

    expect(result.guilds).toHaveLength(1);
    expect(result.guilds[0].id).toBe('g1');
  });

  it('api.moderation.logs builds query params correctly', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }),
    } as Response);

    const { api } = await import('../dashboard/src/api/client');
    await api.moderation.logs('guild1', { page: 2, pageSize: 10, type: 'WARN' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/guilds/guild1/moderation/logs?page=2&pageSize=10&type=WARN',
      expect.anything()
    );
  });

  it('api.automod.updateConfig sends PUT with body', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { guild_id: 'guild1', enabled: true } }),
    } as Response);

    const { api } = await import('../dashboard/src/api/client');
    await api.automod.updateConfig('guild1', { enabled: true });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/guilds/guild1/automod/config',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ enabled: true }),
        credentials: 'include',
      })
    );
  });

  it('throws ApiRequestError on 401', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized', code: 'NOT_AUTHENTICATED' }),
    } as Response);

    const { api, ApiRequestError } = await import('../dashboard/src/api/client');

    try {
      await api.guilds.list();
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      expect((err as InstanceType<typeof ApiRequestError>).status).toBe(401);
      expect((err as InstanceType<typeof ApiRequestError>).code).toBe('UNAUTHORIZED');
    }
  });

  it('throws ApiRequestError on 403', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden', code: 'MISSING_MANAGE_GUILD' }),
    } as Response);

    const { api, ApiRequestError } = await import('../dashboard/src/api/client');

    try {
      await api.moderation.logs('guild1');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      expect((err as InstanceType<typeof ApiRequestError>).status).toBe(403);
    }
  });

  it('throws ApiRequestError on 404', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found', code: 'CASE_NOT_FOUND' }),
    } as Response);

    const { api, ApiRequestError } = await import('../dashboard/src/api/client');

    try {
      await api.moderation.getCase('guild1', 999);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      expect((err as InstanceType<typeof ApiRequestError>).status).toBe(404);
    }
  });

  it('throws ApiRequestError on 429', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Too many requests', code: 'RATE_LIMITED' }),
    } as Response);

    const { api, ApiRequestError } = await import('../dashboard/src/api/client');

    try {
      await api.guilds.list();
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      expect((err as InstanceType<typeof ApiRequestError>).status).toBe(429);
    }
  });

  it('throws ApiRequestError on 500', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal error', code: 'TICKETS_FETCH_FAILED' }),
    } as Response);

    const { api, ApiRequestError } = await import('../dashboard/src/api/client');

    try {
      await api.tickets.list('guild1');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      expect((err as InstanceType<typeof ApiRequestError>).status).toBe(500);
    }
  });

  it('api.tickets.list sends correct params', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }),
    } as Response);

    const { api } = await import('../dashboard/src/api/client');
    await api.tickets.list('guild1', { status: 'OPEN', page: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/guilds/guild1/tickets?status=OPEN&page=1',
      expect.anything()
    );
  });

  it('api.settings.update sends PUT', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { guild_id: 'guild1', language: 'en' } }),
    } as Response);

    const { api } = await import('../dashboard/src/api/client');
    await api.settings.update('guild1', { language: 'en' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/guilds/guild1/settings',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('api.security.getConfig fetches combined config', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { antiRaid: {}, quarantine: {}, verification: {}, channelWarning: {} } }),
    } as Response);

    const { api } = await import('../dashboard/src/api/client');
    const result = await api.security.getConfig('guild1');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/guilds/guild1/security/config',
      expect.anything()
    );
    expect(result.data).toHaveProperty('antiRaid');
  });

  it('all module endpoints are defined', async () => {
    const { api } = await import('../dashboard/src/api/client');

    expect(typeof api.auth.login).toBe('function');
    expect(typeof api.auth.me).toBe('function');
    expect(typeof api.auth.logout).toBe('function');
    expect(typeof api.guilds.list).toBe('function');
    expect(typeof api.guilds.get).toBe('function');
    expect(typeof api.analytics.overview).toBe('function');
    expect(typeof api.moderation.logs).toBe('function');
    expect(typeof api.moderation.getCase).toBe('function');
    expect(typeof api.moderation.getWarnings).toBe('function');
    expect(typeof api.automod.getConfig).toBe('function');
    expect(typeof api.automod.updateConfig).toBe('function');
    expect(typeof api.automod.getRules).toBe('function');
    expect(typeof api.security.getConfig).toBe('function');
    expect(typeof api.security.updateAntiRaid).toBe('function');
    expect(typeof api.security.updateQuarantine).toBe('function');
    expect(typeof api.security.updateVerification).toBe('function');
    expect(typeof api.security.updateChannelWarning).toBe('function');
    expect(typeof api.security.getQuarantineLogs).toBe('function');
    expect(typeof api.tickets.list).toBe('function');
    expect(typeof api.tickets.get).toBe('function');
    expect(typeof api.applications.list).toBe('function');
    expect(typeof api.applications.get).toBe('function');
    expect(typeof api.staff.list).toBe('function');
    expect(typeof api.welcome.getConfig).toBe('function');
    expect(typeof api.welcome.updateConfig).toBe('function');
    expect(typeof api.roles.getAutoRole).toBe('function');
    expect(typeof api.roles.updateAutoRole).toBe('function');
    expect(typeof api.leveling.leaderboard).toBe('function');
    expect(typeof api.leveling.getUser).toBe('function');
    expect(typeof api.giveaways.list).toBe('function');
    expect(typeof api.giveaways.get).toBe('function');
    expect(typeof api.events.list).toBe('function');
    expect(typeof api.events.get).toBe('function');
    expect(typeof api.polls.list).toBe('function');
    expect(typeof api.polls.get).toBe('function');
    expect(typeof api.reminders.list).toBe('function');
    expect(typeof api.settings.get).toBe('function');
    expect(typeof api.settings.update).toBe('function');
  });
});
