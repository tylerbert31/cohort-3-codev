'use client';

import React, { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}) => {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Focus management on dialog open:
    // If activeElement is already inside the dialog (e.g. from React autoFocus), don't disturb it.
    // Otherwise, check for autofocus attribute, then first content focusable, then first dialog focusable.
    const timer = setTimeout(() => {
      if (!dialogRef.current) return;

      const currentActive = document.activeElement;
      if (
        currentActive &&
        dialogRef.current.contains(currentActive) &&
        currentActive !== dialogRef.current
      ) {
        return;
      }

      const autoFocusEl = dialogRef.current.querySelector<HTMLElement>(
        '[autofocus], [data-autofocus]'
      );
      if (autoFocusEl) {
        autoFocusEl.focus();
        return;
      }

      const contentFocusable =
        contentRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      if (contentFocusable && contentFocusable.length > 0) {
        contentFocusable[0].focus();
        return;
      }

      const allFocusable =
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector);
      if (allFocusable.length > 0) {
        allFocusable[0].focus();
        return;
      }

      dialogRef.current.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable =
          dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector);
        if (focusable.length === 0) return;

        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-xs transition-opacity"
      onClick={() => onCloseRef.current()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full sm:max-w-md bg-canvas-card rounded-t-xl sm:rounded-xl border border-canvas-border shadow-lg outline-none',
          'flex flex-col max-h-[90vh] overflow-hidden'
        )}
      >
        {/* Mobile drag handle hint */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-canvas-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-canvas-border">
          <div>
            <h2 id={titleId} className="text-lg font-serif font-bold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-xs text-ink-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close dialog"
            className="touch-target rounded-lg text-ink-muted hover:text-ink hover:bg-canvas-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="p-5 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 bg-canvas-subtle/60 border-t border-canvas-border flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
