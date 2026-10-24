'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  ChecklistTemplate,
  TemplateSection,
  TemplateItem,
} from '@/types/database';
import { deleteTemplateAction } from '@/server/actions/checklist';
import { InlineAlert } from '@/components/ui/inline-alert';
import { EmptyState } from '@/components/ui/state-views';
import { Trash2, Layers, BookmarkCheck, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface TemplatesViewProps {
  initialTemplates: (ChecklistTemplate & {
    sections: (TemplateSection & { items: TemplateItem[] })[];
  })[];
}

export default function TemplatesView({ initialTemplates }: TemplatesViewProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDelete = async (templateId: string) => {
    // Optimistic UI update
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));

    try {
      const res = await deleteTemplateAction(templateId);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to delete template.');
        router.refresh();
      }
    } catch {
      setErrorMsg('Error deleting template.');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 rounded-xl border border-canvas-border bg-canvas-card">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink tracking-tight">
            Checklist Templates
          </h1>
          <p className="text-sm text-ink-muted mt-1 max-w-xl">
            Reusable loadouts copied from your trips. To create a new template, open any trip with items and choose <span className="font-semibold text-ink">&ldquo;Save as Template&rdquo;</span> from the trip menu.
          </p>
        </div>

        <Link
          href="/"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-canvas-border bg-canvas-subtle hover:bg-canvas text-ink text-xs font-medium transition-colors"
        >
          <span>View Trips</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-ink-muted" />
        </Link>
      </div>

      {errorMsg && (
        <InlineAlert type="error" message={errorMsg} />
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <EmptyState
          title="No packing templates yet"
          description="Templates cannot be created manually from scratch. To create a template, build your gear checklist in any active or past trip, then select 'Save as Template' from the trip menu."
          actionLabel="Browse Trips"
          onAction={() => router.push('/')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tmpl) => {
            const totalItemsCount = tmpl.sections.reduce(
              (acc, sec) => acc + (sec.items?.length || 0),
              0
            );

            return (
              <div
                key={tmpl.id}
                className="rounded-xl border border-canvas-border bg-canvas-card p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <BookmarkCheck className="w-5 h-5 text-pine-600 shrink-0" />
                      <h2 className="text-base font-serif font-bold text-ink">
                        {tmpl.name}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(tmpl.id)}
                      className="touch-target p-2 rounded-lg text-ink-subtle hover:text-terracotta-600 hover:bg-terracotta-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
                      title="Delete template"
                      aria-label={`Delete ${tmpl.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {tmpl.description && (
                    <p className="text-xs text-ink-muted mb-3 line-clamp-2">
                      {tmpl.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-ink-muted mb-4 font-mono">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Layers className="w-3.5 h-3.5 text-pine-600" />
                      {tmpl.sections.length} categories
                    </span>
                    <span>·</span>
                    <span>{totalItemsCount} items</span>
                  </div>

                  {tmpl.sections.length > 0 && (
                    <div className="space-y-2 pt-2.5 border-t border-canvas-border/60">
                      {tmpl.sections.slice(0, 3).map((sec) => (
                        <div key={sec.id} className="text-xs">
                          <span className="font-semibold text-ink">
                            {sec.title}:
                          </span>{' '}
                          <span className="text-ink-muted">
                            {sec.items?.map((i) => i.title).join(', ') || 'No items'}
                          </span>
                        </div>
                      ))}
                      {tmpl.sections.length > 3 && (
                        <div className="text-xs text-ink-muted italic">
                          +{tmpl.sections.length - 3} more categories
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
