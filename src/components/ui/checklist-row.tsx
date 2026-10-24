import React from 'react';
import { cn } from '@/lib/utils';
import { Check, User, Lock, Trash2, Calendar } from 'lucide-react';

export interface ChecklistRowProps {
  id: string;
  title: string;
  notes?: string;
  quantity?: number | string;
  assigneeName?: string;
  assigneeImageUrl?: string;
  deadline?: string | null;
  isCompleted?: boolean;
  isEventLocked?: boolean;
  onToggle?: (id: string, nextState: boolean) => void;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const ChecklistRow: React.FC<ChecklistRowProps> = ({
  id,
  title,
  notes,
  quantity,
  assigneeName,
  assigneeImageUrl,
  deadline,
  isCompleted = false,
  isEventLocked = false,
  onToggle,
  onSelect,
  onDelete,
}) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEventLocked) return;
    onToggle?.(id, !isCompleted);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEventLocked) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle?.(id, !isCompleted);
    }
  };

  const hasMetadata = Boolean(quantity || deadline || assigneeName || notes);

  return (
    <div
      role="button"
      tabIndex={isEventLocked ? -1 : 0}
      onKeyDown={handleKeyDown}
      onClick={() => onSelect?.(id)}
      className={cn(
        'group flex flex-col gap-1.5 p-3 sm:p-3.5 rounded-xl border bg-white transition-all select-none cursor-pointer',
        'border-canvas-border/80 hover:border-ink-subtle hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600',
        'active:scale-[0.99] transition-transform duration-100',
        isCompleted && 'bg-canvas-subtle/40 border-canvas-border/60 opacity-80',
        isEventLocked && 'cursor-default bg-locked-surface/30 hover:border-canvas-border hover:shadow-none'
      )}
    >
      {/* Top Primary Line: Checkbox + Title + Actions */}
      <div className="flex items-center justify-between gap-2.5 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Accessible Checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={isCompleted}
            aria-label={isCompleted ? `Mark ${title} incomplete` : `Mark ${title} complete`}
            disabled={isEventLocked}
            onClick={handleCheckboxClick}
            className={cn(
              'w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-1',
              isCompleted
                ? 'bg-pine-600 border-pine-600 text-white shadow-2xs'
                : 'border-canvas-border bg-white hover:border-pine-500 shadow-2xs',
              isEventLocked && 'opacity-60 cursor-not-allowed border-locked-border'
            )}
          >
            {isCompleted && <Check className="w-4 h-4 stroke-[2.5]" />}
          </button>

          {/* Title with full visibility */}
          <span
            className={cn(
              'text-sm sm:text-base font-semibold text-ink leading-snug break-words transition-all line-clamp-2',
              isCompleted && 'line-through text-ink-muted'
            )}
          >
            {title}
          </span>
        </div>

        {/* Action icons on right */}
        <div className="flex items-center gap-1 shrink-0">
          {onDelete && !isEventLocked && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              aria-label={`Delete ${title}`}
              className="p-1.5 rounded-lg text-ink-muted hover:text-terracotta-600 hover:bg-terracotta-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {isEventLocked && (
            <span
              className="p-1 text-locked-text"
              title="Trip is completed and permanently locked"
              aria-label="Locked"
            >
              <Lock className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>

      {/* Bottom Metadata Line: Aligned under the title */}
      {hasMetadata && (
        <div className="flex flex-wrap items-center gap-1.5 pl-8.5 text-xs">
          {quantity && (
            <span className="shrink-0 px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-canvas-subtle text-ink-muted border border-canvas-border/70">
              {quantity}
            </span>
          )}

          {deadline && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-pine-50 text-pine-800 border border-pine-200">
              <Calendar className="w-3 h-3 text-pine-600" />
              <span>{deadline.split('T')[0]}</span>
            </span>
          )}

          {assigneeName && (
            <div
              className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-canvas-subtle border border-canvas-border/70 text-[11px] text-ink-muted"
              title={`Assigned to ${assigneeName}`}
            >
              {assigneeImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assigneeImageUrl}
                  alt={assigneeName}
                  className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                />
              ) : (
                <User className="w-3 h-3 shrink-0" aria-hidden="true" />
              )}
              <span className="max-w-[110px] truncate">{assigneeName}</span>
            </div>
          )}

          {notes && (
            <span className="w-full text-xs text-ink-muted line-clamp-1 italic mt-0.5">
              {notes}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
