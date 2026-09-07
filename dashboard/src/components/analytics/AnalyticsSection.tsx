import { Card } from '../ui/Card';
import { BarChartWithStats } from './BarChart';
import { StatCardSkeleton } from '../ui/Skeleton';

interface AnalyticsSectionProps {
  title: string;
  metrics: {
    label: string;
    value: number;
    chartData: { label: string; value: number }[];
    color?: string;
  }[];
  loading?: boolean;
}

export function AnalyticsSection({ title, metrics, loading }: AnalyticsSectionProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-eltron-text uppercase tracking-wider">{title}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-eltron-text uppercase tracking-wider">{title}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <BarChartWithStats
              title={m.label}
              value={m.value}
              data={m.chartData}
              color={m.color}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
