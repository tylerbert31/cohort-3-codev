'use client';

import { Suspense } from 'react';
import { SignUp } from '@clerk/nextjs';
import { Compass } from 'lucide-react';
import { LoadingSkeleton } from '@/components/ui/state-views';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-pine-600 text-white flex items-center justify-center shadow-sm mb-3">
          <Compass className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Outing & Packing Checklist</h1>
        <p className="text-sm text-ink-muted mt-1 max-w-xs">
          Get started with your Google account.
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton count={2} />}>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full max-w-sm',
              card: 'border border-canvas-border shadow-md rounded-2xl bg-white p-6',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton:
                'border border-canvas-border hover:bg-canvas-subtle min-h-[46px] rounded-lg transition-colors font-medium text-ink',
              footer: 'hidden',
            },
          }}
        />
      </Suspense>
    </div>
  );
}
