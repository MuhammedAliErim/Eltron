import { IconName } from '../../lib/icons';
import { Icon } from './Icon';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: IconName;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, icon = 'Bot', action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 p-3 rounded-full bg-eltron-elevated">
        <Icon name={icon} size={32} className="text-eltron-subtle" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-eltron-text">{title}</h3>
      <p className="mb-6 text-sm text-eltron-muted max-w-sm">{description}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 p-3 rounded-full bg-eltron-danger-muted">
        <Icon name="AlertTriangle" size={24} className="text-eltron-danger" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-eltron-text">Something went wrong</h3>
      <p className="mb-6 text-sm text-eltron-muted max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <Icon name="Refresh" size={16} />
          Try Again
        </Button>
      )}
    </div>
  );
}

export function LoadingDisplay() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-eltron-border border-t-eltron-accent rounded-full animate-spin" />
    </div>
  );
}
