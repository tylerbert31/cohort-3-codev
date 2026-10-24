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
import { InlineAlert } from '@/components/ui/inline-alert';
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
          <p className="text-sm text-ink-muted mt-1 max-w-lg">
            Save and reuse your gear loadouts across multiple trips (e.g. Backcountry Trekking, Weekend Car Camping).
          </p>
        </div>

        <Button
          onClick={() => {
            setErrorMsg(null);
            setIsCreateOpen(true);
          }}
          className="self-start sm:self-auto gap-1.5"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </Button>
      </div>

      {errorMsg && (
        <InlineAlert type="error" message={errorMsg} />
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <EmptyState
          title="No packing templates yet"
          description="Build reusable templates so you don't have to assemble camping gear lists from scratch every trip."
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

      {/* Create Template Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Checklist Template"
        description="Build a reusable master checklist template for expeditions."
      >
        <form onSubmit={handleCreate} className="space-y-4 py-1">
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
