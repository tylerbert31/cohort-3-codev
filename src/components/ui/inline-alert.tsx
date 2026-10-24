import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export interface InlineAlertProps {
  type?: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  message: string;
  className?: string;
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  type = 'error',
  title,
  message,
  className,
}) => {
  const styles = {
    error: 'border-terracotta-200 bg-terracotta-50 text-terracotta-700',
    warning: 'border-amber-500/30 bg-amber-50 text-amber-800',
    success: 'border-pine-200 bg-pine-50 text-pine-700',
    info: 'border-canvas-border bg-canvas-subtle text-ink',
  };

  const icons = {
    error: <AlertCircle className="w-4 h-4 text-terracotta-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    success: <CheckCircle className="w-4 h-4 text-pine-600 shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-pine-600 shrink-0 mt-0.5" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-lg border text-xs sm:text-sm',
        styles[type],
        className
      )}
    >
      {icons[type]}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-semibold mb-0.5">{title}</h4>}
        <p>{message}</p>
      </div>
    </div>
  );
};
