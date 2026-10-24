'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { LandingPageView } from '@/components/landing/landing-page';

export default function RootPage() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div
        className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-ink-muted"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="w-8 h-8 rounded-full border-2 border-pine-600 border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-mono tracking-wider uppercase text-ink-subtle">
          Loading trailhead...
        </p>
      </div>
    );
  }

  if (isSignedIn) {
    return <DashboardView />;
  }

  return <LandingPageView />;
}
