import { useGuild } from '../contexts/GuildContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { PageHeader } from '../components/PageHeader';
import { StatCard, StatCardSkeleton } from '../components/dashboard/StatCard';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { QuickActions } from '../components/dashboard/QuickActions';
import { EmptyState, ErrorDisplay } from '../components/ui/EmptyState';
import type { IconName } from '../lib/icons';

interface MetricInfo {
  label: string;
  value: number;
  icon: IconName;
  color?: string;
}

export function DashboardPage() {
  const { activeGuild } = useGuild();
  const { analytics, loading, error, fetchOverview } = useAnalytics(activeGuild?.id || null);

  if (!activeGuild) {
    return (
      <EmptyState
        title="No Server Selected"
        description="Select a server from the sidebar to view its dashboard."
        icon="Bot"
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Dashboard" description={`Overview of ${activeGuild.name}`} icon="Dashboard" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchOverview} />;
  }

  const primaryMetrics: MetricInfo[] = [
    { label: 'Messages', value: analytics?.messages_total || 0, icon: 'Message', color: 'text-eltron-accent' },
    { label: 'Members Joined', value: analytics?.members_joined || 0, icon: 'Members', color: 'text-eltron-success' },
    { label: 'Members Left', value: analytics?.members_left || 0, icon: 'Members', color: 'text-eltron-warning' },
    { label: 'Moderation', value: analytics?.moderation_actions || 0, icon: 'Shield', color: 'text-eltron-danger' },
  ];

  const secondaryMetrics: MetricInfo[] = [
    { label: 'Warnings', value: analytics?.warnings || 0, icon: 'AlertTriangle' },
    { label: 'Tickets', value: analytics?.tickets_created || 0, icon: 'Tickets' },
    { label: 'Giveaways', value: analytics?.giveaways_created || 0, icon: 'Giveaways' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard" description={`Weekly overview for ${activeGuild.name}`} icon="Dashboard" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryMetrics.map((m) => (
          <StatCard key={m.label} title={m.label} value={m.value} icon={m.icon} color={m.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {secondaryMetrics.map((m) => (
          <StatCard key={m.label} title={m.label} value={m.value} icon={m.icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityFeed />
        <QuickActions />
      </div>
    </div>
  );
}
