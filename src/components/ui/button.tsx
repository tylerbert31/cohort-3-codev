import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'quiet';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]';

    const variants = {
      primary: 'bg-pine-600 hover:bg-pine-700 text-white',
      secondary:
        'bg-canvas-subtle hover:bg-canvas-muted text-ink border border-canvas-border',
      outline:
        'border border-canvas-border hover:bg-canvas-subtle text-ink',
      destructive:
        'bg-terracotta-500 hover:bg-terracotta-600 text-white',
      ghost: 'hover:bg-canvas-subtle text-ink',
      quiet: 'text-ink-muted hover:text-ink hover:bg-canvas-subtle/80',
    };

    const sizes = {
      sm: 'min-h-[40px] px-3 py-1.5 text-sm gap-1.5 touch-target', // Guaranteed >= 44px tap target via utility
      md: 'min-h-[44px] px-4 py-2 text-base gap-2',
      lg: 'min-h-[48px] px-6 py-3 text-lg gap-2.5',
      icon: 'min-h-[44px] min-w-[44px] p-2.5 rounded-lg touch-target',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
