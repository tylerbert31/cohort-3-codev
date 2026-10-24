import React from 'react';
import { cn } from '@/lib/utils';
import { Clock, Lock, Archive, CheckCircle, AlertCircle } from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'active' | 'completed' | 'archived' | 'pending' | 'neutral' | 'attention';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium select-none';

  const variants = {
    active: 'bg-amber-50 text-amber-700 border border-amber-500/20',
    attention: 'bg-amber-100 text-amber-800 border border-amber-500/30',
    completed: 'bg-locked-surface text-locked-text border border-locked-border',
    archived: 'bg-canvas-subtle text-ink-muted border border-canvas-border',
    pending: 'bg-pine-50 text-pine-700 border border-pine-500/20',
    neutral: 'bg-canvas-subtle/80 text-ink border border-canvas-border',
  };

  const icons = {
    active: <Clock className="w-3 h-3 text-amber-600" aria-hidden="true" />,
    attention: <AlertCircle className="w-3 h-3 text-amber-700" aria-hidden="true" />,
    completed: <Lock className="w-3 h-3 text-locked-text" aria-hidden="true" />,
    archived: <Archive className="w-3 h-3 text-ink-muted" aria-hidden="true" />,
    pending: <CheckCircle className="w-3 h-3 text-pine-600" aria-hidden="true" />,
    neutral: null,
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props}>
      {icons[variant]}
      <span>{children}</span>
    </span>
  );
};
