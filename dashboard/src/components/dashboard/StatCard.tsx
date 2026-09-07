import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import type { IconName } from '../../lib/icons';
import { formatNumber, classNames } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: IconName;
  color?: string;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export function StatCard({ title, value, icon, color = 'text-eltron-muted', trend, className }: StatCardProps) {
  return (
    <div className={classNames('card p-4 hover:shadow-card-hover transition-shadow duration-200', className)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-eltron-muted uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-eltron-text mt-1 tabular-nums">{formatNumber(value)}</p>
          {trend && (
            <div className={classNames('flex items-center gap-1 mt-1.5 text-xs font-medium',
              trend.isPositive ? 'text-eltron-success' : 'text-eltron-danger'
            )}>
              <Icon name={trend.isPositive ? 'TrendingUp' : 'TrendingDown'} size={12} />
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={classNames('p-2.5 rounded-lg bg-eltron-elevated', color)}>
          <Icon name={icon} size={20} />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  );
}
