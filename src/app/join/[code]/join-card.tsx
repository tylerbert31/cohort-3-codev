'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignInButton } from '@clerk/nextjs';
import { joinEventAction } from '@/server/actions/invitations';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/state-views';

interface JoinCardProps {
  inviteCode: string;
}

export default function JoinCard({ inviteCode }: JoinCardProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanCode = inviteCode.trim().toUpperCase();

  const handleJoin = async () => {
    setIsJoining(true);
    setErrorMessage(null);

    try {
      const res = await joinEventAction(cleanCode);
      if (res.success && res.data) {
        router.push(`/events/${res.data.eventId}`);
      } else {
        setErrorMessage(res.error || 'Failed to join outing with this invite code.');
      }
    } catch {
      setErrorMessage('A network error occurred while validating the invite code.');
    } finally {
      setIsJoining(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--color-ink-muted)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-pine-600)] border-t-transparent mb-3" />
        <p>Verifying session...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas-card)] p-6 shadow-sm">
        <ErrorState
          title="Invitation Error"
          message={errorMessage}
          onRetry={() => {
            setErrorMessage(null);
            handleJoin();
          }}
        />
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas-card)] p-8 shadow-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-pine-100)] text-[var(--color-pine-600)]">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          Outing Invitation
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          You have been invited to collaborate on an outing checklist.
        </p>

        <div className="mt-4 rounded-lg bg-[var(--color-canvas)] px-3 py-1 font-mono text-sm tracking-wider font-semibold text-[var(--color-pine-600)] border border-[var(--color-canvas-border)]">
          CODE: {cleanCode}
        </div>
      </div>

      {!isSignedIn ? (
        <div className="space-y-4">
          <p className="text-center text-xs text-[var(--color-ink-muted)]">
            To view trip details and coordinate with the group, please sign in with Google.
          </p>

          <SignInButton mode="modal">
            <Button className="w-full bg-[var(--color-pine-600)] hover:bg-[var(--color-pine-700)] text-white shadow-sm">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign in with Google to Accept
            </Button>
          </SignInButton>

          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="w-full text-xs text-[var(--color-ink-muted)]"
          >
            Decline & Return Home
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Button
            onClick={handleJoin}
            isLoading={isJoining}
            className="w-full bg-[var(--color-pine-600)] hover:bg-[var(--color-pine-700)] text-white shadow-sm"
          >
            Join This Outing
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="w-full text-xs text-[var(--color-ink-muted)]"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
