import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StatCard, StatCardSkeleton } from '../components/dashboard/StatCard';
import { ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { api } from '../api/client';
import type { BotStatus } from '../lib/types';

interface ConnectionStatusProps {
  label: string;
  status: 'connected' | 'disconnected' | 'unknown';
}

function ConnectionStatus({ label, status }: ConnectionStatusProps) {
  const color = status === 'connected' ? 'text-eltron-success' : status === 'disconnected' ? 'text-eltron-danger' : 'text-eltron-muted';

  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-eltron-success animate-pulse' : status === 'disconnected' ? 'bg-eltron-danger' : 'bg-eltron-muted'}`} />
      <div className="flex-1">
        <p className="text-sm font-medium text-eltron-text">{label}</p>
        <p className={`text-xs ${color}`}>{status === 'connected' ? 'Connected' : status === 'disconnected' ? 'Disconnected' : 'Unknown'}</p>
      </div>
    </div>
  );
}

export function BotStatusPage() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.bot.getStatus();
      setStatus(res.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bot status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading && !status) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Bot Status" description="Real-time bot health and metrics" icon="Activity" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <LoadingDisplay />
      </div>
    );
  }

  if (error && !status) {
    return <ErrorDisplay message={error} onRetry={fetchStatus} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Bot Status"
        description={`Real-time bot health${lastUpdated ? ` - Updated ${lastUpdated.toLocaleTimeString()}` : ''}`}
        icon="Activity"
        actions={
          <button onClick={fetchStatus} className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5">
            <Icon name="Refresh" size={14} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Uptime" value={status?.uptime || 0} icon="Clock" color="text-eltron-success" />
        <StatCard title="Ping" value={status?.ping || 0} icon="Activity" color="text-eltron-accent" />
        <StatCard title="Guilds" value={status?.guilds || 0} icon="Members" color="text-eltron-warning" />
        <StatCard title="Users" value={status?.users || 0} icon="Users" color="text-eltron-accent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-eltron-muted uppercase tracking-wider mb-1">Memory Used</p>
          <p className="text-2xl font-bold text-eltron-text">{status?.memory.used || 0} MB</p>
          <p className="text-xs text-eltron-muted mt-1">of {status?.memory.total || 0} MB</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-eltron-muted uppercase tracking-wider mb-1">Commands</p>
          <p className="text-2xl font-bold text-eltron-text">{status?.commands || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-eltron-muted uppercase tracking-wider mb-1">Node.js</p>
          <p className="text-lg font-bold text-eltron-text">{status?.nodeVersion || '-'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-eltron-muted uppercase tracking-wider mb-1">Discord.js</p>
          <p className="text-lg font-bold text-eltron-text">{status?.discordJsVersion || '-'}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-eltron-text mb-3">Connections</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ConnectionStatus label="Discord Gateway" status={(status?.gatewayStatus as 'connected' | 'disconnected') || 'unknown'} />
          <ConnectionStatus label="Database" status="connected" />
          <ConnectionStatus label="API Server" status="connected" />
        </div>
      </div>
    </div>
  );
}
