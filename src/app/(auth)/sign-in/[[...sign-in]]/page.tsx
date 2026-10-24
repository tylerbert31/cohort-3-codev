'use client';

import { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';
import { Compass } from 'lucide-react';
import { LoadingSkeleton } from '@/components/ui/state-views';
import { useDynamicRedirectUrl } from '@/lib/auth-redirect';

function SignInContent() {
  const dynamicRedirectUrl = useDynamicRedirectUrl('/');

  return (
    <SignIn
      fallbackRedirectUrl={dynamicRedirectUrl}
      forceRedirectUrl={dynamicRedirectUrl}
      appearance={{
        elements: {
          rootBox: 'w-full max-w-sm',
          card: 'border border-canvas-border rounded-xl bg-white p-6 shadow-sm',
          headerTitle: 'hidden',
          headerSubtitle: 'hidden',
          socialButtonsBlockButton:
            'border border-canvas-border hover:bg-canvas-subtle min-h-[46px] rounded-lg transition-colors font-medium text-ink',
          footer: 'hidden',
        },
      }}
    />
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-pine-600 text-white flex items-center justify-center mb-3">
          <Compass className="w-7 h-7 stroke-[1.75]" />
        </div>
        <h1 className="text-3xl font-serif font-bold tracking-tight text-ink">cohort</h1>
        <p className="text-sm text-ink-muted mt-1 max-w-xs">
          Sign in with Google to coordinate group gear, assign packing tasks, and manage expedition lists.
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton count={2} />}>
        <SignInContent />
      </Suspense>
    </div>
  );
}
