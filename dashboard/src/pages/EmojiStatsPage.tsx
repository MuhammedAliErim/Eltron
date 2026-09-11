import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { PageHeader } from '../components/PageHeader';
import { StatCard, StatCardSkeleton } from '../components/dashboard/StatCard';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { api } from '../api/client';
import type { EmojiStats } from '../lib/types';

export function EmojiStatsPage() {
  const { activeGuild } = useGuild();
  const [stats, setStats] = useState<EmojiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchStats = useCallback(async () => {
    if (!activeGuild) return;
    try {
      const res = await api.emojiStats.get(activeGuild.id);
      setStats(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emoji stats');
    } finally {
      setLoading(false);
    }
  }, [activeGuild]);

  useEffect(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  if (!activeGuild) {
    return (
      <EmptyState
        title="No Server Selected"
        description="Select a server from the sidebar to view emoji statistics."
        icon="Bot"
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Emoji Statistics" description={`Emojis for ${activeGuild.name}`} icon="Analytics" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <LoadingDisplay />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchStats} />;
  }

  const filteredEmojis = stats?.emojis.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Emoji Statistics" description={`Emojis for ${activeGuild.name}`} icon="Analytics" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Emojis" value={stats?.total || 0} icon="Analytics" color="text-eltron-accent" />
        <StatCard title="Animated" value={stats?.animated || 0} icon="Activity" color="text-eltron-success" />
        <StatCard title="Static" value={stats?.static || 0} icon="Bot" color="text-eltron-warning" />
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-eltron-muted" />
            <input
              type="text"
              placeholder="Search emojis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-eltron-elevated border border-eltron-border rounded-lg text-sm text-eltron-text placeholder:text-eltron-muted focus:outline-none focus:border-eltron-accent"
            />
          </div>
        </div>

        {filteredEmojis.length === 0 ? (
          <div className="text-center py-8 text-sm text-eltron-muted">
            {search ? 'No emojis match your search.' : 'No emojis found.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredEmojis.map((emoji) => (
              <div key={emoji.name} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-eltron-elevated hover:bg-eltron-border/50 transition-colors">
                <img
                  src={emoji.url}
                  alt={emoji.name}
                  className="w-10 h-10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="text-center">
                  <p className="text-xs font-medium text-eltron-text truncate max-w-[80px]">:{emoji.name}:</p>
                  <div className="flex items-center gap-1 mt-1">
                    {emoji.animated && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-eltron-success/10 text-eltron-success">GIF</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
