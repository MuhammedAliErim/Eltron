import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { CustomCommand } from '../lib/types';

export function useCustomCommands(guildId: string | null) {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommands = useCallback(async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.customCommands.list(guildId);
      setCommands(res.data as CustomCommand[]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch custom commands');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const createCommand = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    await api.customCommands.create(guildId, body);
    await fetchCommands();
  }, [guildId, fetchCommands]);

  const updateCommand = useCallback(async (name: string, body: Record<string, unknown>) => {
    if (!guildId) return;
    await api.customCommands.update(guildId, name, body);
    await fetchCommands();
  }, [guildId, fetchCommands]);

  const deleteCommand = useCallback(async (name: string) => {
    if (!guildId) return;
    await api.customCommands.delete(guildId, name);
    await fetchCommands();
  }, [guildId, fetchCommands]);

  const refetch = useCallback(() => {
    fetchCommands();
  }, [fetchCommands]);

  return { commands, loading, error, fetchCommands, createCommand, updateCommand, deleteCommand, refetch };
}
