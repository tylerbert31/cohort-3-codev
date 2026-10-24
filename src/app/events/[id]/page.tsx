import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getEventDetailsAction } from '@/server/actions/events';
import { PermissionDeniedState } from '@/components/ui/state-views';
import { AppShell } from '@/components/layout/app-shell';
import EventView from './event-view';

async function EventContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect(`/sign-in?redirect_url=/events/${id}`);
  }

  const res = await getEventDetailsAction(id);

  if (!res.success) {
    if (res.code === 'FORBIDDEN' || res.error?.includes('participant')) {
      return (
        <div className="py-12">
          <PermissionDeniedState />
        </div>
      );
    }

    notFound();
  }

  const { event, members, activities, sections, unsectionedItems, userRole } = res.data;

  return (
    <EventView
      initialEvent={event}
      initialMembers={members}
      initialActivities={activities}
      initialSections={sections}
      initialUnsectionedItems={unsectionedItems}
      userRole={userRole}
      currentUserId={userId}
    />
  );
}

export default function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-12 text-[var(--color-ink-muted)]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-pine-600)] border-t-transparent mb-3" />
            <p>Loading outing details...</p>
          </div>
        }
      >
        <EventContent params={params} />
      </Suspense>
    </AppShell>
  );
}
