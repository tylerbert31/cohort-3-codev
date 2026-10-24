'use client';

import React from 'react';
import Link from 'next/link';
import { UserButton, SignInButton, useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { resolveDynamicRedirectUrl } from '@/lib/auth-redirect';
import {
  Compass,
  Calendar,
  Layers,
  Plus,
  Share2,
  LogIn,
} from 'lucide-react';

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
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-canvas-border px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-lg text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 rounded-md"
          >
            <div className="w-8 h-8 rounded-lg bg-pine-600 text-white flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <span className="tracking-tight font-bold text-xl">cohort</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-1.5" aria-label="Main Navigation">
            <Link
              href="/"
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'events'
                  ? 'bg-canvas-subtle text-pine-700 font-semibold'
                  : 'text-ink-muted hover:text-ink hover:bg-canvas-subtle'
              )}
            >
              Trips
            </Link>
            <Link
              href="/templates"
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'templates'
                  ? 'bg-canvas-subtle text-pine-700 font-semibold'
                  : 'text-ink-muted hover:text-ink hover:bg-canvas-subtle'
              )}
            >
              Templates
            </Link>
          </nav>

          {/* Header Actions & Auth */}
          <div className="flex items-center gap-2.5">
            {onShareAction && (
              <button
                type="button"
                onClick={onShareAction}
                aria-label="Share trip invite link"
                className="touch-target rounded-lg border border-canvas-border text-ink hover:bg-canvas-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            {onNewAction && (
              <button
                type="button"
                onClick={onNewAction}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-pine-600 text-white text-sm font-medium hover:bg-pine-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
              >
                <Plus className="w-4 h-4" />
                <span>{eventTitle ? 'Add Item' : 'New Trip'}</span>
              </button>
            )}

            {/* Clerk Authentication Controls */}
            {isSignedIn ? (
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-8 h-8 rounded-full border border-canvas-border',
                  },
                }}
              />
            ) : (
              <SignInButton
                mode="modal"
                fallbackRedirectUrl={resolveDynamicRedirectUrl(typeof window !== 'undefined' ? window.location.pathname : '/', '/')}
                forceRedirectUrl={resolveDynamicRedirectUrl(typeof window !== 'undefined' ? window.location.pathname : '/', '/')}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-pine-600 text-white text-xs sm:text-sm font-medium hover:bg-pine-700 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-28 sm:pb-12">
        {eventTitle && (
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{eventTitle}</h1>
          </div>
        )}
        {children}
      </main>

      {/* Mobile Sticky Bottom Navigation (360px - 640px) */}
      <nav
        aria-label="Mobile Navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xs border-t border-canvas-border px-3 py-2 flex items-center justify-around shadow-lg"
      >
        <Link
          href="/"
          className={cn(
            'flex flex-col items-center gap-1 min-w-[48px] py-1.5 px-3 text-xs font-medium rounded-lg',
            activeTab === 'events' ? 'text-pine-600 font-bold' : 'text-ink-muted'
          )}
        >
          <Calendar className="w-5 h-5" />
          <span>Trips</span>
        </Link>

        {onNewAction && (
          <button
            type="button"
            onClick={onNewAction}
            aria-label={eventTitle ? 'Add checklist item' : 'Create new trip'}
            className="w-12 h-12 -mt-5 rounded-full bg-pine-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        )}

        <Link
          href="/templates"
          className={cn(
            'flex flex-col items-center gap-1 min-w-[48px] py-1.5 px-3 text-xs font-medium rounded-lg',
            activeTab === 'templates' ? 'text-pine-600 font-bold' : 'text-ink-muted'
          )}
        >
          <Layers className="w-5 h-5" />
          <span>Templates</span>
        </Link>
      </nav>
    </div>
  );
};
