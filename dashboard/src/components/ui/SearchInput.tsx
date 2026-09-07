import { Icon } from './Icon';
import { classNames } from '../../lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  return (
    <div className={classNames('relative', className)}>
      <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-eltron-subtle" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 pr-3"
        aria-label={placeholder}
      />
    </div>
  );
}
