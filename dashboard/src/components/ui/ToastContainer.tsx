import { Icon } from './Icon';
import type { Toast } from '../../lib/types';

const iconMap: Record<Toast['type'], string> = {
  success: 'Check',
  error: 'X',
  warning: 'AlertTriangle',
  info: 'Info',
};

const colorMap: Record<Toast['type'], string> = {
  success: 'text-eltron-success border-eltron-success/30',
  error: 'text-eltron-danger border-eltron-danger/30',
  warning: 'text-eltron-warning border-eltron-warning/30',
  info: 'text-eltron-info border-eltron-info/30',
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const iconName = iconMap[toast.type] as 'Check' | 'X' | 'AlertTriangle' | 'Info';
  return (
    <div
      className={`flex items-start gap-3 p-3 bg-eltron-elevated border rounded-lg shadow-dropdown animate-slide-up ${colorMap[toast.type]}`}
    >
      <Icon name={iconName} size={16} className="mt-0.5 flex-shrink-0" />
      <p className="text-sm text-eltron-text flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-eltron-muted hover:text-eltron-text flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <Icon name="X" size={14} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
