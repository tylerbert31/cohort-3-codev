'use client';

import React from 'react';
import Link from 'next/link';
import { UserButton, SignInButton, useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { resolveDynamicRedirectUrl } from '@/lib/auth-redirect';
import { Compass, Calendar, Layers, Plus, Share2, LogIn, ArrowUpRight } from 'lucide-react';

export interface AppShellProps {
  children: React.ReactNode;
  activeTab?: 'events' | 'templates' | 'profile';
  eventTitle?: string;
  onNewAction?: () => void;
  onShareAction?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab = 'events',
  eventTitle,
  onNewAction,
  onShareAction,
}) => {
  const { isSignedIn } = useUser();

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-canvas-border/80 bg-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-7 lg:px-10">
          <Link href="/" className="group flex items-center gap-3 rounded-xl focus-visible:outline-none" aria-label="cohort home">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-pine-100 shadow-sm transition-transform group-hover:-rotate-6">
              <Compass className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[21px] font-semibold tracking-[-0.06em]">cohort<span className="text-pine-600">.</span></span>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-[.19em] text-ink-subtle">Go together</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-canvas-border bg-white/70 p-1 sm:flex" aria-label="Main navigation">
            <Link href="/" className={cn('rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all', activeTab === 'events' ? 'bg-ink text-white shadow-sm' : 'text-ink-muted hover:bg-canvas-subtle hover:text-ink')}>
              My trips
            </Link>
            <Link href="/templates" className={cn('rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all', activeTab === 'templates' ? 'bg-ink text-white shadow-sm' : 'text-ink-muted hover:bg-canvas-subtle hover:text-ink')}>
              Templates
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {onShareAction && (
              <button type="button" onClick={onShareAction} aria-label="Share trip invite link" className="touch-target rounded-full border border-canvas-border bg-white text-ink-muted transition hover:border-ink hover:text-ink">
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {onNewAction && (
              <button type="button" onClick={onNewAction} className="hidden items-center gap-2 rounded-full bg-pine-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_5px_0_#34521c] transition hover:-translate-y-0.5 hover:bg-pine-700 hover:shadow-[0_7px_0_#34521c] active:translate-y-0.5 active:shadow-none sm:inline-flex">
                <Plus className="h-4 w-4" />
                {eventTitle ? 'Add item' : 'Plan a trip'}
              </button>
            )}
            {isSignedIn ? (
              <UserButton appearance={{ elements: { userButtonAvatarBox: 'h-9 w-9 rounded-full border-2 border-white shadow-sm' } }} />
            ) : (
              <SignInButton mode="modal" fallbackRedirectUrl={resolveDynamicRedirectUrl(typeof window !== 'undefined' ? window.location.pathname : '/', '/')} forceRedirectUrl={resolveDynamicRedirectUrl(typeof window !== 'undefined' ? window.location.pathname : '/', '/')}>
                <button type="button" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-700">
                  <LogIn className="h-4 w-4" /><span>Sign in</span><ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-7 sm:px-7 sm:pb-12 sm:pt-10 lg:px-10">
        {eventTitle && (
          <div className="mb-8 border-b border-canvas-border pb-6">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[.22em] text-pine-700">Your expedition / active workspace</p>
            <h1 className="text-3xl font-semibold tracking-[-.055em] sm:text-4xl">{eventTitle}</h1>
          </div>
        )}
        {children}
      </main>

      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-canvas-border bg-canvas/95 px-4 pb-[max(.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:hidden">
        <Link href="/" className={cn('flex min-w-[76px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold', activeTab === 'events' ? 'text-pine-700' : 'text-ink-subtle')}>
          <Calendar className="h-5 w-5" /><span>Trips</span>
        </Link>
        {onNewAction && (
          <button type="button" onClick={onNewAction} aria-label={eventTitle ? 'Add checklist item' : 'Create new trip'} className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-2xl border-[3px] border-canvas bg-pine-600 text-white shadow-lg shadow-pine-900/20 transition active:scale-95">
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        )}
        <Link href="/templates" className={cn('flex min-w-[76px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold', activeTab === 'templates' ? 'text-pine-700' : 'text-ink-subtle')}>
          <Layers className="h-5 w-5" /><span>Templates</span>
        </Link>
      </nav>
    </div>
  );
};
