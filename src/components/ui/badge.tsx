import React from 'react';
import { cn } from '@/lib/utils';
import { Lock, CheckCircle2, Clock, Archive } from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'active' | 'completed' | 'archived' | 'pending' | 'neutral';
  icon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  icon = true,
  children,
  ...props
}) => {
  const variants = {
    active: 'bg-amber-100 text-amber-700 border-amber-500/20',
    completed: 'bg-locked-surface text-locked-text border-locked-border',
    archived: 'bg-canvas-subtle text-ink-muted border-canvas-border',
    pending: 'bg-pine-100 text-pine-700 border-pine-200',
    neutral: 'bg-white text-ink border-canvas-border shadow-2xs',
  };

  const icons = {
    active: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
    completed: <Lock className="w-3.5 h-3.5" aria-hidden="true" />,
    archived: <Archive className="w-3.5 h-3.5" aria-hidden="true" />,
    pending: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
    neutral: null,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border',
        variants[variant],
        className
      )}
      {...props}
    >
      {icon && icons[variant]}
      {children}
    </span>
  );
};
