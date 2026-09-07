import { useMemo } from 'react';
import { Tooltip } from '../ui/Tooltip';
import { formatNumber, classNames } from '../../lib/utils';

interface BarChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartData[];
  color?: string;
  height?: number;
  showLabels?: boolean;
}

export function BarChart({ data, color = 'bg-eltron-accent', height = 200, showLabels = true }: BarChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-sm text-eltron-muted">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((item, i) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <Tooltip key={i} content={`${item.label}: ${formatNumber(item.value)}`} side="top">
              <div className="flex-1 flex flex-col items-center justify-end h-full group">
                <div
                  className={classNames(
                    'w-full rounded-t-sm transition-all duration-300 group-hover:opacity-80 min-h-[2px]',
                    color
                  )}
                  style={{ height: `${barHeight}%` }}
                />
              </div>
            </Tooltip>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex gap-1">
          {data.map((item, i) => (
            <div key={i} className="flex-1 text-center">
              <span className="text-2xs text-eltron-subtle truncate block">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface BarChartWithStatsProps {
  title: string;
  value: number;
  data: BarChartData[];
  color?: string;
}

export function BarChartWithStats({ title, value, data, color = 'bg-eltron-accent' }: BarChartWithStatsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-eltron-text">{title}</h3>
        <span className="text-2xl font-bold text-eltron-text tabular-nums">{formatNumber(value)}</span>
      </div>
      <BarChart data={data} color={color} height={160} />
    </div>
  );
}
