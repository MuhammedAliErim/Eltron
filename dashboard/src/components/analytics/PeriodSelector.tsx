import { Tabs } from '../ui/Tabs';
import type { AnalyticsPeriod } from '../../lib/types';
import { ANALYTICS_PERIODS } from '../../lib/constants';

interface PeriodSelectorProps {
  value: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Tabs
      tabs={ANALYTICS_PERIODS.map(p => ({ id: p.value, label: p.label }))}
      activeTab={value}
      onChange={(id) => onChange(id as AnalyticsPeriod)}
    />
  );
}
