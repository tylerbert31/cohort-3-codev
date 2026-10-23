import React from 'react';
import { Button } from './button';
import {
  Compass,
  AlertCircle,
  ShieldAlert,
  Lock,
  WifiOff,
  RotateCcw,
} from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-canvas-border bg-canvas-subtle/30 my-4">
    <div className="w-12 h-12 rounded-full bg-pine-50 border border-pine-200 flex items-center justify-center text-pine-600 mb-3">
      <Compass className="w-6 h-6" />
    </div>
    <h3 className="text-base font-semibold text-ink">{title}</h3>
    <p className="text-sm text-ink-muted max-w-sm mt-1 mb-4">{description}</p>
    {actionLabel && onAction && (
      <Button variant="primary" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-terracotta-500/20 bg-terracotta-50/50 my-4">
    <AlertCircle className="w-8 h-8 text-terracotta-500 mb-2" />
    <h4 className="text-base font-semibold text-ink">{title}</h4>
    <p className="text-sm text-ink-muted max-w-sm mt-1 mb-3">{message}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
        Try again
      </Button>
    )}
  </div>
);

export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="flex flex-col gap-2.5 my-3" aria-label="Loading content" role="status">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="h-14 w-full rounded-xl bg-canvas-subtle/70 animate-pulse border border-canvas-border/50"
      />
    ))}
  </div>
);

export const PermissionDeniedState: React.FC<{ onReturn?: () => void }> = ({ onReturn }) => (
  <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-canvas-border bg-white shadow-xs max-w-md mx-auto my-8">
    <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
      <ShieldAlert className="w-6 h-6" />
    </div>
    <h3 className="text-lg font-semibold text-ink">Access Restricted</h3>
    <p className="text-sm text-ink-muted mt-1 mb-5">
      You are not a registered participant of this event. Ask the owner for a valid invite code or link to join.
    </p>
    {onReturn && (
      <Button variant="secondary" onClick={onReturn}>
        Return to Dashboard
      </Button>
    )}
  </div>
);

export const LockedEventBanner: React.FC = () => (
  <div
    role="alert"
    className="flex items-center gap-2.5 p-3.5 rounded-xl border border-locked-border bg-locked-surface text-ink text-sm my-3 shadow-2xs"
  >
    <Lock className="w-4 h-4 text-locked-text shrink-0" />
    <div className="flex-1">
      <span className="font-semibold text-ink">Event Completed:</span> This event is permanently locked against further checklist changes.
    </div>
  </div>
);

export const ReconnectingBanner: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex items-center justify-center gap-2 py-1.5 px-3 bg-amber-500 text-white text-xs font-medium text-center"
  >
    <WifiOff className="w-3.5 h-3.5 animate-pulse" />
    <span>Connection lost. Reconnecting to live checklist updates...</span>
  </div>
);
