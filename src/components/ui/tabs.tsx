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
  variant?: 'underline' | 'segmented';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  ariaLabel = 'Navigation Tabs',
  variant = 'underline',
}) => {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'select-none',
        variant === 'segmented'
          ? 'grid w-full grid-cols-3 items-stretch gap-1 rounded-xl border border-canvas-border/80 bg-canvas-subtle/75 p-1'
          : 'flex items-center gap-1 overflow-x-auto border-b border-canvas-border px-1 scrollbar-none',
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
            tabIndex={isActive ? 0 : -1}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              const tabButtons = event.currentTarget
                .closest('[role="tablist"]')
                ?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
              if (!tabButtons?.length) return;

              const currentIndex = Array.from(tabButtons).indexOf(event.currentTarget);
              let nextIndex = currentIndex;

              if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabButtons.length;
              else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
              else if (event.key === 'Home') nextIndex = 0;
              else if (event.key === 'End') nextIndex = tabButtons.length - 1;
              else return;

              event.preventDefault();
              const nextTab = tabButtons[nextIndex];
              if (!nextTab) return;
              nextTab.focus();
              nextTab.click();
            }}
            className={cn(
              'flex min-h-[44px] items-center gap-1.5 py-2 text-xs font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 sm:text-sm',
              variant === 'segmented'
                ? 'min-w-0 justify-center rounded-lg px-1.5 sm:px-3'
                : 'shrink-0 justify-start whitespace-nowrap border-b-2 -mb-[1px] px-3.5 sm:px-3.5',
              variant === 'segmented'
                ? cn(
                    'rounded-lg border border-transparent',
                    isActive
                      ? 'border-white bg-[#fffefa] font-semibold text-ink shadow-[0_1px_3px_rgba(23,43,36,.08)]'
                      : 'text-ink-muted hover:bg-white/60 hover:text-ink'
                  )
                : cn(
                    isActive
                      ? 'border-pine-600 font-semibold text-pine-700'
                      : 'border-transparent text-ink-muted hover:border-canvas-muted hover:text-ink'
                  )
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
