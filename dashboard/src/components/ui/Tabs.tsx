import { ReactNode, useId } from 'react';
import { classNames } from '../../lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  const baseId = useId();

  return (
    <div
      className={classNames('flex gap-1 p-1 bg-eltron-surface rounded-lg', className)}
      role="tablist"
      aria-label="Period selection"
    >
      {tabs.map((tab) => {
        const tabId = `${baseId}-tab-${tab.id}`;
        const panelId = `${baseId}-panel-${tab.id}`;
        return (
          <button
            key={tab.id}
            id={tabId}
            role="tab"
            aria-selected={tab.id === activeTab}
            aria-controls={panelId}
            disabled={tab.disabled}
            tabIndex={tab.id === activeTab ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={classNames(
              'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              tab.id === activeTab
                ? 'bg-eltron-card text-eltron-text shadow-sm'
                : 'text-eltron-muted hover:text-eltron-text',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
