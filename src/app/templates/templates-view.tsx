'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  ChecklistTemplate,
  TemplateSection,
  TemplateItem,
} from '@/types/database';
import { createTemplateAction, deleteTemplateAction } from '@/server/actions/checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/state-views';
import { Plus, Trash2, Layers, BookmarkCheck } from 'lucide-react';

interface TemplatesViewProps {
  initialTemplates: (ChecklistTemplate & {
    sections: (TemplateSection & { items: TemplateItem[] })[];
  })[];
}

export default function TemplatesView({ initialTemplates }: TemplatesViewProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await createTemplateAction({
        name: templateName.trim(),
        description: templateDesc.trim() || undefined,
      });

      if (res.success && res.data) {
        setIsCreateOpen(false);
        setTemplateName('');
        setTemplateDesc('');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to create template.');
      }
    } catch {
      setErrorMsg('Failed to create template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));

    try {
      const res = await deleteTemplateAction(templateId);
      if (!res.success) {
        router.refresh();
      }
    } catch {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            Checklist Templates
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Build personal templates or save existing trip checklists for instant reuse.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setErrorMsg(null);
            setIsCreateOpen(true);
          }}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-[var(--color-terracotta-200)] bg-[var(--color-terracotta-50)] p-4 text-sm text-[var(--color-terracotta-700)]">
          {errorMsg}
        </div>
      )}

      {templates.length === 0 ? (
        <EmptyState
          title="No personal templates yet"
          description="Create master templates for weekend camping, ultralight backpacking, or beach outings to save setup time."
          actionLabel="Create First Template"
          onAction={() => setIsCreateOpen(true)}
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
                className="rounded-2xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas-card)] p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <BookmarkCheck className="w-5 h-5 text-[var(--color-pine-600)] shrink-0" />
                      <h2 className="text-base font-bold text-[var(--color-ink)]">
                        {tmpl.name}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(tmpl.id)}
                      className="text-zinc-400 hover:text-terracotta-600 p-1 rounded-md"
                      title="Delete template"
                      aria-label={`Delete ${tmpl.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {tmpl.description && (
                    <p className="text-xs text-[var(--color-ink-muted)] mb-3 line-clamp-2">
                      {tmpl.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-[var(--color-ink-muted)] mb-4">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-pine-600" />
                      {tmpl.sections.length} sections
                    </span>
                    <span>•</span>
                    <span>{totalItemsCount} items</span>
                  </div>

                  {tmpl.sections.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[var(--color-canvas-border)]/60">
                      {tmpl.sections.slice(0, 3).map((sec) => (
                        <div key={sec.id} className="text-xs">
                          <span className="font-semibold text-[var(--color-ink)]">
                            {sec.title}:
                          </span>{' '}
                          <span className="text-[var(--color-ink-muted)]">
                            {sec.items?.map((i) => i.title).join(', ') || 'No items'}
                          </span>
                        </div>
                      ))}
                      {tmpl.sections.length > 3 && (
                        <div className="text-xs text-[var(--color-ink-muted)] italic">
                          +{tmpl.sections.length - 3} more sections
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

      {/* Create Template Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Checklist Template"
        description="Build a reusable master checklist template."
      >
        <form onSubmit={handleCreate} className="space-y-4 py-2">
          <Input
            label="Template Name"
            placeholder="e.g. 3-Day Alpine Backpacking"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Gear checklist for high-elevation summer camping"
            value={templateDesc}
            onChange={(e) => setTemplateDesc(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Create Template
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
