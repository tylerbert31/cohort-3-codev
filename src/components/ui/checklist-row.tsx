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

  const handleCheckboxKeyDown = (e: React.KeyboardEvent) => {
    if (isEventLocked) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onToggle?.(id, !isCompleted);
    }
  };

  const handleSelectKeyDown = (e: React.KeyboardEvent) => {
    if (isEventLocked) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(id);
    }
  };

  const hasMetadata = Boolean(quantity || deadline || assigneeName || notes);

  return (
    <div
      className={cn(
        'group flex flex-col gap-2 border-b border-canvas-border/70 bg-transparent px-1 py-3 transition-colors select-none last:border-b-0 sm:gap-2.5 sm:py-3.5',
        'hover:bg-pine-50/35',
        isCompleted && 'opacity-90',
        isEventLocked && 'cursor-default'
      )}
    >
      {/* Top Primary Line: Checkbox + Title (Clickable) + Actions */}
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
            onKeyDown={handleCheckboxKeyDown}
            className={cn(
              'h-7 w-7 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-1',
              isCompleted
                ? 'bg-pine-600 border-pine-600 text-white shadow-2xs'
                : 'border-canvas-border bg-white hover:border-pine-600 hover:bg-pine-50',
              isEventLocked && 'opacity-60 cursor-not-allowed border-locked-border'
            )}
          >
            {isCompleted && <Check className="w-4 h-4 stroke-[2.5]" />}
          </button>

          {/* Title Area (Click to edit gear specs) */}
          <div
            role="button"
            tabIndex={isEventLocked ? -1 : 0}
            onClick={() => onSelect?.(id)}
            onKeyDown={handleSelectKeyDown}
            aria-label={`Edit ${title}`}
            className={cn(
              'flex-1 min-w-0 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-1 py-0.5',
              isEventLocked && 'cursor-default'
            )}
          >
            <span
              className={cn(
                'block break-words text-[15px] font-medium leading-snug text-ink transition-colors sm:text-base',
                isCompleted && 'line-through text-ink-muted'
              )}
            >
              {title}
            </span>
          </div>
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
              title={`Delete ${title}`}
              className="touch-target p-2 rounded-lg text-ink-muted hover:text-terracotta-600 hover:bg-terracotta-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 cursor-pointer"
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
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 pl-9 text-sm cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 sm:pl-10',
            isEventLocked && 'cursor-default'
          )}
        >
          {quantity && (
            <span className="shrink-0 px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-canvas-subtle text-ink-muted border border-canvas-border/70">
              {quantity}
            </span>
          )}

          {deadline && (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-pine-50 text-pine-800 border border-pine-200">
              <Calendar className="w-3 h-3 text-pine-600" />
              <span>{deadline.split('T')[0]}</span>
            </span>
          )}

          {assigneeName && (
            <div
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-canvas-border/70 bg-canvas-subtle px-2.5 py-1 text-xs text-ink-muted"
              title={`Assigned to ${assigneeName}`}
            >
              {assigneeImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assigneeImageUrl}
                  alt={assigneeName}
                  className="h-4 w-4 rounded-full object-cover shrink-0"
                />
              ) : (
                <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="max-w-[130px] truncate">{assigneeName}</span>
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
