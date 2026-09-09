import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import type { Guild } from '../lib/types';

interface GuildContextType {
  guilds: Guild[];
  activeGuild: Guild | null;
  loading: boolean;
  error: string | null;
  setActiveGuild: (guild: Guild | null) => void;
  refreshGuilds: () => Promise<void>;
}

const GuildContext = createContext<GuildContextType | null>(null);

export function GuildProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [activeGuild, setActiveGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuilds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await api.guilds.list();
      const guildList = resp.data;
      setGuilds(guildList);

      const savedGuildId = localStorage.getItem('activeGuildId');
      if (savedGuildId) {
        const found = guildList.find((g) => g.id === savedGuildId);
        if (found) setActiveGuild(found);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch guilds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchGuilds();
    } else {
      setGuilds([]);
      setActiveGuild(null);
      setLoading(false);
    }
  }, [user, fetchGuilds]);

  const handleSetActiveGuild = (guild: Guild | null) => {
    setActiveGuild(guild);
    if (guild) {
      localStorage.setItem('activeGuildId', guild.id);
    } else {
      localStorage.removeItem('activeGuildId');
    }
  };

  return (
    <GuildContext.Provider
      value={{
        guilds,
        activeGuild,
        loading,
        error,
        setActiveGuild: handleSetActiveGuild,
        refreshGuilds: fetchGuilds,
      }}
    >
      {children}
    </GuildContext.Provider>
  );
}

export function useGuild(): GuildContextType {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error('useGuild must be used within a GuildProvider');
  }
  return context;
}
