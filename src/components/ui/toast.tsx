'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'error' | 'info';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...msg, id };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border bg-white shadow-lg text-sm text-ink',
              t.type === 'error'
                ? 'border-terracotta-200 bg-terracotta-50 text-terracotta-700'
                : 'border-canvas-border'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-terracotta-500 shrink-0" />
              ) : t.type === 'info' ? (
                <Info className="w-4 h-4 text-pine-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-pine-600 shrink-0" />
              )}
              <span className="truncate font-medium">{t.message}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    removeToast(t.id);
                  }}
                  className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded bg-pine-600 text-white hover:bg-pine-700 transition-colors"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss toast"
                className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-canvas-subtle transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
