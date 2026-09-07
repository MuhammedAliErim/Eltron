import { ReactNode } from 'react';
import { Icon } from './ui/Icon';
import { Badge } from './ui/Badge';
import type { IconName } from '../lib/icons';
import { classNames } from '../lib/utils';

export interface Column<T> {
  key: string;
  label: string;
  icon?: IconName;
  render?: (item: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string | number;
  emptyIcon?: IconName;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  keyExtractor,
  emptyIcon = 'Bot',
  emptyTitle = 'No data',
  emptyDescription = 'No records found.',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 p-3 rounded-full bg-eltron-elevated">
          <Icon name={emptyIcon} size={28} className="text-eltron-subtle" />
        </div>
        <h3 className="text-sm font-semibold text-eltron-text mb-1">{emptyTitle}</h3>
        <p className="text-xs text-eltron-muted max-w-xs">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-eltron-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={classNames(
                  'text-left py-2.5 px-4 md:px-3 text-2xs font-semibold text-eltron-subtle uppercase tracking-wider',
                  col.hideOnMobile && 'hidden md:table-cell',
                  col.className
                )}
              >
                <span className="flex items-center gap-1.5">
                  {col.icon && <Icon name={col.icon} size={12} />}
                  {col.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={classNames(
                'border-b border-eltron-border/50 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-eltron-elevated/50'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={classNames(
                    'py-3 px-4 md:px-3 text-eltron-text',
                    col.hideOnMobile && 'hidden md:table-cell',
                    col.className
                  )}
                >
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { Badge };
