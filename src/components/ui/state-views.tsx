import React from 'react';
import { Button } from './button';
import {
  Compass,
  AlertCircle,
  ShieldAlert,
  Lock,
  WifiOff,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => (
  <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-canvas-border bg-canvas-subtle/30 my-4">
    <div className="w-12 h-12 rounded-full bg-pine-50 border border-pine-200 flex items-center justify-center text-pine-600 mb-3.5">
      <Compass className="w-6 h-6 stroke-[1.75]" />
    </div>
    <h3 className="text-lg font-serif font-bold text-ink">{title}</h3>
    <p className="text-sm text-ink-muted max-w-sm mt-1 mb-5">{description}</p>
    <div className="flex flex-wrap items-center justify-center gap-3">
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {secondaryActionLabel && onSecondaryAction && (
        <Button variant="outline" size="sm" onClick={onSecondaryAction}>
          {secondaryActionLabel}
        </Button>
      )}
    </div>
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
  <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-terracotta-200 bg-terracotta-50/70 my-4">
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
  <div className="flex flex-col gap-3 my-3" aria-label="Loading content" role="status">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="h-16 w-full rounded-xl bg-canvas-subtle/70 animate-pulse border border-canvas-border/50"
      />
    ))}
  </div>
);

export const PermissionDeniedState: React.FC<{ onReturn?: () => void }> = ({ onReturn }) => (
  <div className="flex flex-col items-center justify-center p-10 text-center rounded-xl border border-canvas-border bg-white max-w-md mx-auto my-8">
    <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
      <ShieldAlert className="w-6 h-6 stroke-[1.75]" />
    </div>
    <h3 className="text-lg font-serif font-bold text-ink">Access Restricted</h3>
    <p className="text-sm text-ink-muted mt-1 mb-5">
      You are not a registered participant of this trip. Ask the trip organizer for a valid invite code or link to join.
    </p>
    {onReturn && (
      <Button variant="secondary" onClick={onReturn}>
        Return to Trips
      </Button>
    )}
  </div>
);

export interface LockedEventBannerProps {
  completedCount?: number;
  totalCount?: number;
  memberCount?: number;
  departureDate?: string | null;
}

export const LockedEventBanner: React.FC<LockedEventBannerProps> = ({
  completedCount,
  totalCount,
  memberCount,
  departureDate,
}) => {
  const isEnriched = totalCount !== undefined;

  if (isEnriched) {
    return (
      <div
        role="region"
        aria-label="Expedition log status"
        className="rounded-2xl border-2 border-pine-200 bg-canvas-card p-5 sm:p-6 shadow-2xs my-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-pine-100 border border-pine-200 flex items-center justify-center text-pine-700 shrink-0 mt-0.5 sm:mt-0">
              <Compass className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-pine-100 text-pine-800 border border-pine-200">
                  Official Field Log
                </span>
                {departureDate && (
                  <span className="text-xs text-ink-muted font-mono">
                    Departed {departureDate}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-ink mt-1">
                Trailhead Field Log · Sealed & Preserved
              </h3>
              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed max-w-xl">
                This expedition logbook has concluded and is permanently sealed against changes. All gear checklists and allocations are preserved in your adventure archive.
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-canvas-border shrink-0">
            <span className="text-xs font-semibold text-pine-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-pine-600" />
              <span className="font-mono">{completedCount} of {totalCount} packed</span>
            </span>
            {memberCount !== undefined && (
              <span className="text-[11px] text-ink-muted font-mono mt-0.5">
                {memberCount} {memberCount === 1 ? 'member' : 'cohort members'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-center gap-2.5 p-3.5 rounded-xl border border-locked-border bg-locked-surface text-ink text-sm my-3"
    >
      <Lock className="w-4 h-4 text-locked-text shrink-0" />
      <div className="flex-1">
        <span className="font-semibold text-ink">Trip Wrapped Up:</span> This expedition log is permanently locked against further checklist changes.
      </div>
    </div>
  );
};

export const ReconnectingBanner: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-50 text-amber-800 text-xs font-medium my-2"
  >
    <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
    <span>Reconnecting live updates... changes will sync automatically.</span>
  </div>
);
