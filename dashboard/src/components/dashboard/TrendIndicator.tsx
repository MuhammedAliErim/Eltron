import { Icon } from '../ui/Icon';
import { classNames } from '../../lib/utils';

interface TrendIndicatorProps {
  value: number;
  isPositive: boolean;
  suffix?: string;
  size?: 'sm' | 'md';
}

export function TrendIndicator({ value, isPositive, suffix = '%', size = 'sm' }: TrendIndicatorProps) {
  if (value === 0) return null;

  return (
    <span
      className={classNames(
        'inline-flex items-center gap-0.5 font-medium',
        isPositive ? 'text-eltron-success' : 'text-eltron-danger',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}
    >
      <Icon name={isPositive ? 'TrendingUp' : 'TrendingDown'} size={size === 'sm' ? 12 : 14} />
      {Math.abs(value)}{suffix}
    </span>
  );
}
