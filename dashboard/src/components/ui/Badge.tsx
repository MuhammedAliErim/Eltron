import { ReactNode } from 'react';
import { classNames } from '../../lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles = {
  default: 'bg-eltron-elevated text-eltron-muted',
  success: 'bg-eltron-success-muted text-eltron-success',
  warning: 'bg-eltron-warning-muted text-eltron-warning',
  danger: 'bg-eltron-danger-muted text-eltron-danger',
  info: 'bg-eltron-info-muted text-eltron-info',
};

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-2xs',
  md: 'px-2 py-0.5 text-xs',
};

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={classNames(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}
