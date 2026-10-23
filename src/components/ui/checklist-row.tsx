import React from 'react';
import { cn } from '@/lib/utils';
import { Check, User, Lock } from 'lucide-react';

export interface ChecklistRowProps {
  id: string;
  title: string;
  notes?: string;
  quantity?: number | string;
  assigneeName?: string;
  assigneeImageUrl?: string;
  isCompleted?: boolean;
  isEventLocked?: boolean;
  onToggle?: (id: string, nextState: boolean) => void;
  onSelect?: (id: string) => void;
}

export const ChecklistRow: React.FC<ChecklistRowProps> = ({
  id,
  title,
  notes,
  quantity,
  assigneeName,
  assigneeImageUrl,
  isCompleted = false,
  isEventLocked = false,
  onToggle,
  onSelect,
}) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEventLocked) return;
    onToggle?.(id, !isCompleted);
  };

  return (
    <div
      onClick={() => onSelect?.(id)}
      className={cn(
        'group flex items-center justify-between gap-3 p-3.5 rounded-xl border bg-white transition-all',
        'border-canvas-border shadow-xs hover:border-ink-subtle',
        isCompleted && 'bg-canvas-subtle/50 opacity-80',
        isEventLocked && 'cursor-default bg-locked-surface/30 hover:border-canvas-border'
      )}
    >
      {/* Checkbox Touch Target (>= 44x44px container) */}
      <div className="flex items-center min-w-[44px] min-h-[44px]">
        <button
          type="button"
          role="checkbox"
          aria-checked={isCompleted}
          aria-label={isCompleted ? `Mark ${title} incomplete` : `Mark ${title} complete`}
          disabled={isEventLocked}
          onClick={handleCheckboxClick}
          className={cn(
            'w-6 h-6 rounded-md border flex items-center justify-center transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2',
            isCompleted
              ? 'bg-pine-600 border-pine-600 text-white'
              : 'border-canvas-border bg-white hover:border-pine-500',
            isEventLocked && 'opacity-60 cursor-not-allowed border-locked-border'
          )}
        >
          {isCompleted && <Check className="w-4 h-4 stroke-[2.5]" />}
        </button>
      </div>

      {/* Item Title and Metadata */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-base font-medium text-ink truncate transition-all',
              isCompleted && 'line-through text-ink-muted'
            )}
          >
            {title}
          </span>
          {quantity && (
            <span className="shrink-0 px-2 py-0.5 text-xs font-semibold rounded-md bg-canvas-subtle text-ink-muted border border-canvas-border">
              {quantity}
            </span>
          )}
        </div>
        {notes && (
          <p className="text-xs text-ink-muted line-clamp-1 mt-0.5">{notes}</p>
        )}
      </div>

      {/* Assignee / Locked Status */}
      <div className="flex items-center gap-2 shrink-0">
        {assigneeName ? (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-canvas-subtle border border-canvas-border text-xs text-ink-muted"
            title={`Assigned to ${assigneeName}`}
          >
            {assigneeImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assigneeImageUrl}
                alt={assigneeName}
                className="w-4 h-4 rounded-full object-cover"
              />
            ) : (
              <User className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span className="max-w-[80px] truncate">{assigneeName}</span>
          </div>
        ) : null}

        {isEventLocked && (
          <span
            className="p-1.5 text-locked-text"
            title="Event is completed and permanently locked"
            aria-label="Locked"
          >
            <Lock className="w-4 h-4" />
          </span>
        )}
      </div>
    </div>
  );
};
