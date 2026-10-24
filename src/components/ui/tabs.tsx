'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  mobileLabel?: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  ariaLabel = 'Navigation Tabs',
}) => {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'grid w-full grid-cols-3 items-stretch gap-1 border-b border-canvas-border px-0 select-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex min-h-[48px] min-w-0 items-center justify-center gap-1.5 border-b-2 px-1.5 py-2 text-xs font-medium leading-tight transition-colors sm:px-3 sm:text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600',
              isActive
                ? 'border-pine-600 text-pine-700 font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink hover:border-canvas-muted'
            )}
          >
            <span className="truncate sm:hidden">{tab.mobileLabel ?? tab.label}</span>
            <span className="hidden truncate sm:inline">{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] rounded-full font-mono font-medium',
                  isActive
                    ? 'bg-pine-100 text-pine-800 font-bold'
                    : 'bg-canvas-subtle text-ink-muted'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
