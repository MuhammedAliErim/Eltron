import { ReactNode } from 'react';
import { Select } from './ui/Select';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  children?: ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {children}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
}

export function FilterSelect({ label, options, value, onChange, allLabel }: FilterSelectProps) {
  const allOptions = [{ label: allLabel || `All ${label}`, value: '' }, ...options];
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-eltron-subtle font-medium">{label}:</span>
      <Select options={allOptions} value={value} onChange={onChange} />
    </div>
  );
}
