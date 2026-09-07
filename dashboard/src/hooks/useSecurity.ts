import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { AntiRaidConfig, QuarantineConfig, QuarantineLog, VerificationConfig, ChannelWarningConfig } from '../lib/types';

interface SecurityConfig {
  antiRaid: AntiRaidConfig;
  quarantine: QuarantineConfig;
  verification: VerificationConfig;
  channelWarning: ChannelWarningConfig;
}

export function useSecurity(guildId: string | null) {
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [quarantineLogs, setQuarantineLogs] = useState<QuarantineLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'security:config');
    const cached = cacheGet<SecurityConfig>(cacheKey);
    if (cached) {
      setConfig(cached);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.security.getConfig(guildId);
      const data = res.data as SecurityConfig;
      setConfig(data);
      cacheSet(cacheKey, data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch security config');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateAntiRaid = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.security.updateAntiRaid(guildId, body);
      cacheInvalidatePrefix(`${guildId}:security`);
      return res.data;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update anti-raid config');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateQuarantine = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.security.updateQuarantine(guildId, body);
      cacheInvalidatePrefix(`${guildId}:security`);
      return res.data;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update quarantine config');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateVerification = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.security.updateVerification(guildId, body);
      cacheInvalidatePrefix(`${guildId}:security`);
      return res.data;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update verification config');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateChannelWarning = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.security.updateChannelWarning(guildId, body);
      cacheInvalidatePrefix(`${guildId}:security`);
      return res.data;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update channel warning config');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const fetchQuarantineLogs = useCallback(async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.security.getQuarantineLogs(guildId);
      setQuarantineLogs(res.data as QuarantineLog[]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch quarantine logs');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:security`);
    fetchConfig();
  }, [guildId, fetchConfig]);

  return {
    config, quarantineLogs, loading, error,
    fetchConfig, updateAntiRaid, updateQuarantine, updateVerification,
    updateChannelWarning, fetchQuarantineLogs, refetch,
  };
}
