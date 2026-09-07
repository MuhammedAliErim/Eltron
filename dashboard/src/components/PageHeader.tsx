import { ReactNode } from 'react';
import { Icon } from './ui/Icon';
import type { IconName } from '../lib/icons';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: IconName;
  actions?: ReactNode;
}

export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2.5 rounded-xl bg-eltron-elevated">
            <Icon name={icon} size={22} className="text-eltron-accent" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-eltron-text">{title}</h1>
          {description && (
            <p className="text-sm text-eltron-muted mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
