import { Icon } from '../../components/ui/Icon';
import { formatNumber } from '../../lib/utils';
import type { IconName } from '../../lib/icons';

interface MetricCardProps {
  title: string;
  value: number;
  icon: IconName;
  color?: string;
}

export function MetricCard({ title, value, icon, color = 'text-eltron-accent' }: MetricCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-eltron-muted">{title}</p>
          <p className="mt-1 text-2xl font-bold text-eltron-text">{formatNumber(value)}</p>
        </div>
        <div className={`p-2.5 rounded-lg bg-eltron-elevated ${color}`}>
          <Icon name={icon} size={22} />
        </div>
      </div>
    </div>
  );
}
