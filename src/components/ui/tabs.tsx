'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
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
        'flex items-center gap-1 border-b border-canvas-border overflow-x-auto no-scrollbar',
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
              'touch-target px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600',
              isActive
                ? 'border-pine-600 text-pine-700 font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink hover:border-canvas-muted'
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'ml-2 px-1.5 py-0.5 text-xs rounded-full font-mono font-medium',
                  isActive
                    ? 'bg-pine-100 text-pine-700'
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
