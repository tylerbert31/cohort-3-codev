'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignInButton } from '@clerk/nextjs';
import { joinEventAction } from '@/server/actions/invitations';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/state-views';
import { Users } from 'lucide-react';

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
        setErrorMessage(res.error || 'Failed to join trip with this invite code. It may have expired or been revoked.');
      }
    } catch {
      setErrorMessage('A network error occurred while validating the invite code.');
    } finally {
      setIsJoining(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-ink-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pine-600 border-t-transparent mb-3" />
        <p className="text-sm">Verifying invitation session...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="w-full max-w-md rounded-xl border border-canvas-border bg-canvas-card p-6">
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
            Go to Trips
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-canvas-border bg-canvas-card p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-100 text-pine-600">
          <Users className="h-7 w-7 stroke-[1.75]" />
        </div>

        <h1 className="text-2xl font-serif font-bold tracking-tight text-ink">
          Expedition Invitation
        </h1>
        <p className="mt-2 text-sm text-ink-muted leading-relaxed">
          You have been invited to join an expedition cohort and collaborate on a shared packing checklist.
        </p>

        <div className="mt-4 rounded-lg bg-canvas-subtle px-3.5 py-1.5 font-mono text-sm tracking-wider font-semibold text-pine-700 border border-canvas-border">
          CODE: {cleanCode}
        </div>
      </div>

      {!isSignedIn ? (
        <div className="space-y-4">
          <p className="text-center text-xs text-ink-muted">
            To view trip details and coordinate with the group, please sign in with Google.
          </p>

          <SignInButton mode="modal">
            <Button className="w-full bg-pine-600 hover:bg-pine-700 text-white gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google to Accept</span>
            </Button>
          </SignInButton>

          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="w-full text-xs text-ink-muted"
          >
            Decline & Return Home
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Button
            onClick={handleJoin}
            isLoading={isJoining}
            className="w-full bg-pine-600 hover:bg-pine-700 text-white"
          >
            Join This Trip
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="w-full text-xs text-ink-muted"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
