import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  className?: string;
  variant?: 'pine' | 'amber' | 'locked';
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  label,
  className,
  variant = 'pine',
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  const variantBar = {
    pine: 'bg-pine-600',
    amber: 'bg-amber-500',
    locked: 'bg-locked-badge',
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex items-center justify-between text-xs text-ink-muted mb-1.5 font-medium">
          <span>{label}</span>
          <span className="font-mono">{Math.round(clamped)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-full h-2 rounded-full bg-canvas-muted overflow-hidden"
      >
        <div
          className={cn('h-full transition-all duration-300 ease-out', variantBar[variant])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
