import type { ApiError, ApiListResponse, ApiResponse } from '../lib/types';

const API_BASE = '/api';

export class ApiRequestError extends Error {
  code: string;
  errorId?: string;
  status: number;
  details?: string[];

  constructor(status: number, body: ApiError) {
    super(body.error);
    this.name = 'ApiRequestError';
    this.code = body.code;
    this.errorId = body.errorId;
    this.status = status;
    this.details = body.details;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiRequestError(res.status, { error: 'Session expired', code: 'UNAUTHORIZED' });
    }
    const body = await res.json().catch(() => ({ error: 'Request failed', code: 'UNKNOWN' }));
    throw new ApiRequestError(res.status, body);
  }

  return res.json();
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export const api = {
  auth: {
    login: () => {
      window.location.href = `${API_BASE}/auth/login`;
    },
    me: () => request<{ data: { user: { id: string; username: string; discriminator: string; global_name: string | null; avatar: string | null } } }>('/auth/me'),
    logout: () => request<{ data: { success: boolean } }>('/auth/logout', { method: 'POST' }),
  },
  guilds: {
    list: () => request<{ data: Array<{ id: string; name: string; icon: string | null; owner: boolean; hasBot: boolean }> }>('/guilds'),
    get: (id: string) => request<{ data: { id: string; name: string; icon: string | null; owner: boolean; settings: Record<string, unknown> | null } }>(`/guilds/${id}`),
  },
  analytics: {
    overview: (guildId: string) => request<{ data: { weekly: Record<string, unknown>; yesterday: Record<string, unknown> } }>(`/guilds/${guildId}/analytics/overview`),
    daily: (guildId: string, date: string) => request<{ data: Record<string, unknown> }>(`/guilds/${guildId}/analytics/daily?date=${date}`),
    weekly: (guildId: string) => request<{ data: Record<string, unknown> }>(`/guilds/${guildId}/analytics/weekly`),
    monthly: (guildId: string) => request<{ data: Record<string, unknown> }>(`/guilds/${guildId}/analytics/monthly`),
    range: (guildId: string, from: string, to: string) => request<{ data: Record<string, unknown> }>(`/guilds/${guildId}/analytics/range?from=${from}&to=${to}`),
  },
  moderation: {
    logs: (guildId: string, params?: { page?: number; pageSize?: number; type?: string; userId?: string }) =>
      request<ApiListResponse<unknown>>(`/guilds/${guildId}/moderation/logs${buildQuery(params || {})}`),
    getCase: (guildId: string, caseId: number) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/moderation/logs/${caseId}`),
    getWarnings: (guildId: string, userId: string) =>
      request<ApiResponse<unknown[]>>(`/guilds/${guildId}/moderation/warnings/${userId}`),
  },
  automod: {
    getConfig: (guildId: string) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/automod/config`),
    updateConfig: (guildId: string, body: Record<string, unknown>) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/automod/config`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    getRules: (guildId: string) =>
      request<ApiResponse<unknown[]>>(`/guilds/${guildId}/automod/rules`),
  },
  security: {
    getConfig: (guildId: string) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/security/config`),
    updateAntiRaid: (guildId: string, body: Record<string, unknown>) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/security/antiraid`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    updateQuarantine: (guildId: string, body: Record<string, unknown>) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/security/quarantine`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    updateVerification: (guildId: string, body: Record<string, unknown>) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/security/verification`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    updateChannelWarning: (guildId: string, body: Record<string, unknown>) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/security/channelwarning`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    getQuarantineLogs: (guildId: string) =>
      request<ApiResponse<unknown[]>>(`/guilds/${guildId}/security/quarantine/logs`),
  },
  tickets: {
    list: (guildId: string, params?: { page?: number; pageSize?: number; status?: string }) =>
      request<ApiListResponse<unknown>>(`/guilds/${guildId}/tickets${buildQuery(params || {})}`),
    get: (guildId: string, ticketId: number) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/tickets/${ticketId}`),
  },
  applications: {
    list: (guildId: string, params?: { page?: number; pageSize?: number; status?: string; type?: string }) =>
      request<ApiListResponse<unknown>>(`/guilds/${guildId}/applications${buildQuery(params || {})}`),
    get: (guildId: string, appId: number) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/applications/${appId}`),
  },
  staff: {
    list: (guildId: string, params?: { status?: string }) =>
      request<ApiResponse<unknown[]>>(`/guilds/${guildId}/staff${buildQuery(params || {})}`),
  },
  welcome: {
    getConfig: (guildId: string) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/welcome/config`),
    updateConfig: (guildId: string, body: Record<string, unknown>) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/welcome/config`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },
  roles: {
    getAutoRole: (guildId: string) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/roles/autorole`),
    updateAutoRole: (guildId: string, body: Record<string, unknown>) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/roles/autorole`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },
  leveling: {
    leaderboard: (guildId: string, params?: { page?: number; pageSize?: number }) =>
      request<ApiListResponse<unknown>>(`/guilds/${guildId}/leveling/leaderboard${buildQuery(params || {})}`),
    getUser: (guildId: string, userId: string) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/leveling/user/${userId}`),
  },
  giveaways: {
    list: (guildId: string, params?: { page?: number; pageSize?: number; status?: string }) =>
      request<ApiListResponse<unknown>>(`/guilds/${guildId}/giveaways${buildQuery(params || {})}`),
    get: (guildId: string, giveawayId: number) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/giveaways/${giveawayId}`),
  },
  events: {
    list: (guildId: string, params?: { page?: number; pageSize?: number; status?: string }) =>
      request<ApiListResponse<unknown>>(`/guilds/${guildId}/events${buildQuery(params || {})}`),
    get: (guildId: string, eventId: number) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/events/${eventId}`),
  },
  polls: {
    list: (guildId: string, params?: { page?: number; pageSize?: number; status?: string }) =>
      request<ApiListResponse<unknown>>(`/guilds/${guildId}/polls${buildQuery(params || {})}`),
    get: (guildId: string, pollId: number) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/polls/${pollId}`),
  },
  reminders: {
    list: (guildId: string, params?: { page?: number; pageSize?: number; status?: string }) =>
      request<ApiListResponse<unknown>>(`/guilds/${guildId}/reminders${buildQuery(params || {})}`),
  },
  settings: {
    get: (guildId: string) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/settings`),
    update: (guildId: string, body: Record<string, unknown>) =>
      request<ApiResponse<unknown>>(`/guilds/${guildId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },
};
