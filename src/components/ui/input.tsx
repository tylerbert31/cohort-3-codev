import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, id, type = 'text', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-ink flex items-center justify-between"
          >
            <span>{label}</span>
            {props.required && <span className="text-xs text-terracotta-500">Required</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          type={type}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          className={cn(
            'w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border text-base text-ink bg-white',
            'placeholder:text-ink-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:border-transparent',
            'transition-colors disabled:opacity-50 disabled:bg-canvas-subtle',
            error
              ? 'border-terracotta-500 focus-visible:ring-terracotta-500'
              : 'border-canvas-border hover:border-ink-subtle',
            className
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-terracotta-500 font-medium mt-0.5">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-xs text-ink-muted mt-0.5">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
