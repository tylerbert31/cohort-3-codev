import { Suspense } from 'react';
import JoinCard from './join-card';

async function JoinContent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinCard inviteCode={code} />;
}

export default function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-canvas)] px-4 py-12">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--color-ink-muted)]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-pine-600)] border-t-transparent mb-3" />
            <p>Loading invite verification...</p>
          </div>
        }
      >
        <JoinContent params={params} />
      </Suspense>
    </div>
  );
}
