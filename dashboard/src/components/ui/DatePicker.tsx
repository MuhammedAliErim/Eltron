import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { classNames } from '../../lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function DatePicker({ value, onChange, label, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={classNames('relative', className)}>
      {label && <label className="block text-xs font-medium text-eltron-muted mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input flex items-center justify-between gap-2 cursor-pointer"
      >
        <span className={value ? 'text-eltron-text' : 'text-eltron-subtle'}>
          {value || 'Select date'}
        </span>
        <Icon name="Calendar" size={16} className="text-eltron-muted" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-eltron-elevated border border-eltron-border rounded-lg shadow-dropdown p-3 animate-scale-in">
          <input
            type="date"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(false);
            }}
            className="bg-transparent text-eltron-text text-sm outline-none"
          />
        </div>
      )}
    </div>
  );
}

interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
}

export function DateRangePicker({ from, to, onFromChange, onToChange, className }: DateRangePickerProps) {
  return (
    <div className={classNames('flex items-end gap-2', className)}>
      <DatePicker value={from} onChange={onFromChange} label="From" />
      <DatePicker value={to} onChange={onToChange} label="To" />
    </div>
  );
}
