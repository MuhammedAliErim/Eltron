import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { BREADCRUMB_MAP } from '../../lib/constants';

interface BreadcrumbItem {
  label?: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link to="/dashboard" className="text-eltron-muted hover:text-eltron-text transition-colors">
        <Icon name="Home" size={14} />
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          <Icon name="ChevronRight" size={14} className="text-eltron-subtle" />
          {item.href ? (
            <Link to={item.href} className="text-eltron-muted hover:text-eltron-text transition-colors">
              {item.label || BREADCRUMB_MAP[item.href.split('/').pop() || ''] || item.href}
            </Link>
          ) : (
            <span className="text-eltron-text font-medium">
              {item.label || BREADCRUMB_MAP[item.href?.split('/').pop() || ''] || ''}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
