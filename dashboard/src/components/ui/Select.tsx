import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { classNames } from '../../lib/utils';

interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Select({ options, value, onChange, placeholder = 'Select...', className }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input flex items-center justify-between gap-2 cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selected ? 'text-eltron-text' : 'text-eltron-subtle'}>
          {selected?.label || placeholder}
        </span>
        <Icon name="ChevronDown" size={16} className={classNames('text-eltron-muted transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-eltron-elevated border border-eltron-border rounded-lg shadow-dropdown overflow-hidden animate-scale-in" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={classNames(
                'w-full px-3 py-2 text-sm text-left transition-colors',
                option.value === value
                  ? 'bg-eltron-accent-muted text-eltron-accent'
                  : 'text-eltron-text hover:bg-eltron-card',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
              role="option"
              aria-selected={option.value === value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
