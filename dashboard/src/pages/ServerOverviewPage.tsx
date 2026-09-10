import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { StatCard, StatCardSkeleton } from '../components/dashboard/StatCard';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { getGuildIconUrl, formatRelativeTime } from '../lib/utils';
import type { IconName } from '../lib/icons';

interface ServerInfo {
  memberCount: number;
  onlineCount: number;
  textChannels: number;
  voiceChannels: number;
  roles: number;
  emojis: number;
  boostLevel: number;
  boostCount: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  moderator: string;
  target: string;
  timestamp: string;
}

export function ServerOverviewPage() {
  const { activeGuild } = useGuild();
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeGuild) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [guildResp, modResp] = await Promise.all([
          api.guilds.get(activeGuild.id),
          api.moderation.logs(activeGuild.id, { pageSize: 5 }),
        ]);

        const guildData = guildResp.data as Record<string, unknown>;
        setServerInfo({
          memberCount: (guildData.memberCount as number) || 0,
          onlineCount: (guildData.onlineCount as number) || 0,
          textChannels: (guildData.textChannels as number) || 0,
          voiceChannels: (guildData.voiceChannels as number) || 0,
          roles: (guildData.roles as number) || 0,
          emojis: (guildData.emojis as number) || 0,
          boostLevel: (guildData.boostLevel as number) || 0,
          boostCount: (guildData.boostCount as number) || 0,
        });

        const logs = (modResp.data || []) as Array<{
          id: string;
          type: string;
          moderator_id: string;
          user_id: string;
          created_at: string;
        }>;
        setAuditLog(
          logs.map((log) => ({
            id: log.id,
            action: log.type,
            moderator: log.moderator_id,
            target: log.user_id,
            timestamp: log.created_at,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch server info');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeGuild]);

  if (!activeGuild) {
    return (
      <EmptyState
        title="No Server Selected"
        description="Select a server from the sidebar to view its overview."
        icon="Bot"
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Server Overview" description={`Details for ${activeGuild.name}`} icon="Dashboard" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <LoadingDisplay />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
  }

  const stats: Array<{ label: string; value: number; icon: IconName; color?: string }> = [
    { label: 'Total Members', value: serverInfo?.memberCount || 0, icon: 'Members', color: 'text-eltron-accent' },
    { label: 'Online Members', value: serverInfo?.onlineCount || 0, icon: 'Activity', color: 'text-eltron-success' },
    { label: 'Text Channels', value: serverInfo?.textChannels || 0, icon: 'Message', color: 'text-eltron-info' },
    { label: 'Voice Channels', value: serverInfo?.voiceChannels || 0, icon: 'Activity', color: 'text-eltron-warning' },
    { label: 'Roles', value: serverInfo?.roles || 0, icon: 'Shield', color: 'text-eltron-danger' },
    { label: 'Emojis', value: serverInfo?.emojis || 0, icon: 'Star', color: 'text-eltron-muted' },
  ];

  const boostTiers = ['None', 'Tier 1', 'Tier 2', 'Tier 3'];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Server Overview" description={`Details for ${activeGuild.name}`} icon="Dashboard" />

      <div className="card p-6">
        <div className="flex items-center gap-4">
          {activeGuild.icon ? (
            <img
              src={getGuildIconUrl(activeGuild.id, activeGuild.icon, 128)!}
              alt=""
              className="w-20 h-20 rounded-2xl"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-eltron-elevated flex items-center justify-center text-3xl font-bold text-eltron-muted">
              {activeGuild.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-eltron-text truncate">{activeGuild.name}</h2>
            <p className="text-sm text-eltron-muted mt-1">ID: {activeGuild.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-eltron-elevated text-sm font-medium text-eltron-text">
              <Icon name="Star" size={14} className="inline mr-1.5 text-eltron-warning" />
              {boostTiers[serverInfo?.boostLevel || 0]}
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-eltron-elevated text-sm font-medium text-eltron-text">
              <Icon name="TrendingUp" size={14} className="inline mr-1.5 text-eltron-accent" />
              {serverInfo?.boostCount || 0} Boosts
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} title={stat.label} value={stat.value} icon={stat.icon} color={stat.color} />
        ))}
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-eltron-text mb-4">Recent Audit Log</h3>
        {auditLog.length === 0 ? (
          <p className="text-sm text-eltron-muted text-center py-4">No recent audit log entries</p>
        ) : (
          <div className="space-y-3">
            {auditLog.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-eltron-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-eltron-elevated">
                    <Icon name="Shield" size={16} className="text-eltron-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-eltron-text">{entry.action}</p>
                    <p className="text-xs text-eltron-muted">
                      Moderator: {entry.moderator} → Target: {entry.target}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-eltron-subtle">{formatRelativeTime(entry.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-eltron-text mb-4">Bot Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-eltron-elevated">
            <div className="p-2 rounded-lg bg-eltron-success-muted">
              <Icon name="Activity" size={18} className="text-eltron-success" />
            </div>
            <div>
              <p className="text-xs text-eltron-muted uppercase tracking-wider">Status</p>
              <p className="text-sm font-semibold text-eltron-text">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-eltron-elevated">
            <div className="p-2 rounded-lg bg-eltron-accent-muted">
              <Icon name="Clock" size={18} className="text-eltron-accent" />
            </div>
            <div>
              <p className="text-xs text-eltron-muted uppercase tracking-wider">Uptime</p>
              <p className="text-sm font-semibold text-eltron-text">99.9%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
