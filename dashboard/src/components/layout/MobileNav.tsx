import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { NAV_ITEMS } from '../../lib/constants';
import { classNames } from '../../lib/utils';

export function MobileNav() {
  const location = useLocation();
  const items = NAV_ITEMS.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-eltron-surface border-t border-eltron-border z-40" aria-label="Mobile navigation">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.disabled ? '#' : item.href}
              onClick={(e) => item.disabled && e.preventDefault()}
              className={classNames(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-0',
                isActive
                  ? 'text-eltron-accent'
                  : 'text-eltron-subtle',
                item.disabled && 'opacity-40'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon name={item.icon} size={20} />
              <span className="text-2xs font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
