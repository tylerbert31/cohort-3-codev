import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { listUserTemplatesAction } from '@/server/actions/checklist';
import { AppShell } from '@/components/layout/app-shell';
import TemplatesView from './templates-view';

async function TemplatesContent() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in?redirect_url=/templates');
  }

  const res = await listUserTemplatesAction();
  const templates = res.success && res.data ? res.data : [];

  return <TemplatesView initialTemplates={templates} />;
}

export default function TemplatesPage() {
  return (
    <AppShell activeTab="templates">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-12 text-[var(--color-ink-muted)]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-pine-600)] border-t-transparent mb-3" />
            <p>Loading personal templates...</p>
          </div>
        }
      >
        <TemplatesContent />
      </Suspense>
    </AppShell>
  );
}
