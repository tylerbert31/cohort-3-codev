'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  Event,
  EventMember,
  ActivityEvent,
  Profile,
  ChecklistSection,
  ChecklistItem,
  ChecklistTemplate,
  TemplateSection,
  TemplateItem,
} from '@/types/database';
import {
  archiveEventAction,
  restoreEventAction,
  completeEventAction,
} from '@/server/actions/events';
import { generateInviteCodeAction, revokeInviteCodeAction } from '@/server/actions/invitations';
import {
  createSectionAction,
  createItemAction,
  toggleItemCompletionAction,
  deleteItemAction,
  saveTemplateFromEventAction,
  applyTemplateToEventAction,
  listUserTemplatesAction,
} from '@/server/actions/checklist';
import { useEventRealtime } from '@/lib/supabase/use-event-realtime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { ChecklistRow } from '@/components/ui/checklist-row';
import { LockedEventBanner, EmptyState } from '@/components/ui/state-views';
import {
  Plus,
  BookmarkPlus,
  Layers,
  Sparkles,
  Trash2,
  Calendar,
  MapPin,
  Users,
} from 'lucide-react';

interface EventViewProps {
  initialEvent: Event;
  initialMembers: (EventMember & { profile?: Profile })[];
  initialActivities: ActivityEvent[];
  initialSections: (ChecklistSection & { items: ChecklistItem[] })[];
  userRole: 'owner' | 'participant';
  currentUserId: string;
}

export default function EventView({
  initialEvent,
  initialMembers,
  initialActivities,
  initialSections,
  userRole,
  currentUserId,
}: EventViewProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event>(initialEvent);
  const [members] = useState(initialMembers);
  const [activities] = useState<ActivityEvent[]>(initialActivities);
  const [sections, setSections] = useState<(ChecklistSection & { items: ChecklistItem[] })[]>(
    initialSections
  );
  const [activeTab, setActiveTab] = useState<'checklist' | 'members' | 'activity'>('checklist');

  // Realtime hook to automatically synchronize changes across participants
  const { status: realtimeStatus } = useEventRealtime({
    eventId: event.id,
    onRefresh: () => router.refresh(),
  });

  // Action states & Modals
  const [actionError, setActionError] = useState<string | null>(null);

  // Invite modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // Completion modal
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Add Section modal
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);

  // Add Item modal
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemAssigneeId, setItemAssigneeId] = useState<string>('');
  const [itemNotes, setItemNotes] = useState('');
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Templates modal
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);

  const [isApplyTemplateOpen, setIsApplyTemplateOpen] = useState(false);
  const [userTemplates, setUserTemplates] = useState<
    (ChecklistTemplate & { sections: (TemplateSection & { items: TemplateItem[] })[] })[]
  >([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  const isOwner = userRole === 'owner';
  const isLocked = event.status === 'completed';
  const isArchived = event.status === 'archived';

  // Overall checklist progress calculations
  const totalItems = sections.reduce((acc, sec) => acc + sec.items.length, 0);
  const completedItems = sections.reduce(
    (acc, sec) => acc + sec.items.filter((it) => it.is_completed).length,
    0
  );
  const overallProgressPct =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Handle invite modal open
  const handleOpenInvite = async () => {
    setIsInviteOpen(true);
    if (!inviteCode) {
      setIsGeneratingInvite(true);
      try {
        const res = await generateInviteCodeAction(event.id);
        if (res.success && res.data) {
          setInviteCode(res.data.invite.invite_code);
        } else {
          setActionError(res.error || 'Failed to generate invite code.');
        }
      } catch {
        setActionError('Failed to generate invite code.');
      } finally {
        setIsGeneratingInvite(false);
      }
    }
  };

  const handleCopyLink = () => {
    if (!inviteCode) return;
    const url = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(url);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  };

  const handleRevokeInvite = async () => {
    if (!inviteCode) return;
    try {
      const res = await revokeInviteCodeAction(inviteCode);
      if (res.success) {
        setInviteCode(null);
        setIsInviteOpen(false);
      } else {
        setActionError(res.error || 'Failed to revoke invite.');
      }
    } catch {
      setActionError('Failed to revoke invite code.');
    }
  };

  const handleArchiveToggle = async () => {
    setIsArchiving(true);
    setActionError(null);
    try {
      if (isArchived) {
        const res = await restoreEventAction(event.id);
        if (res.success && res.data) {
          setEvent(res.data);
          router.refresh();
        } else {
          setActionError(res.error || 'Failed to restore event.');
        }
      } else {
        const res = await archiveEventAction(event.id);
        if (res.success && res.data) {
          setEvent(res.data);
          router.refresh();
        } else {
          setActionError(res.error || 'Failed to archive event.');
        }
      }
    } catch {
      setActionError('An error occurred updating the outing state.');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleConfirmComplete = async () => {
    setIsCompleting(true);
    setActionError(null);
    try {
      const res = await completeEventAction(event.id);
      if (res.success && res.data) {
        setEvent(res.data);
        setIsCompleteModalOpen(false);
        router.refresh();
      } else {
        setActionError(res.error || 'Failed to complete outing.');
      }
    } catch {
      setActionError('Failed to lock outing.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Section & Item Handlers
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim()) return;

    setIsSubmittingSection(true);
    setActionError(null);

    try {
      const res = await createSectionAction({
        eventId: event.id,
        title: sectionTitle.trim(),
      });

      if (res.success && res.data) {
        setSections((prev) => [...prev, { ...res.data, items: [] }]);
        setIsAddSectionOpen(false);
        setSectionTitle('');
      } else {
        setActionError(res.error || 'Failed to create section.');
      }
    } catch {
      setActionError('An error occurred creating section.');
    } finally {
      setIsSubmittingSection(false);
    }
  };

  const handleOpenAddItem = (sectionId: string) => {
    setTargetSectionId(sectionId);
    setItemTitle('');
    setItemQuantity('');
    setItemAssigneeId('');
    setItemNotes('');
    setIsAddItemOpen(true);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || !targetSectionId) return;

    setIsSubmittingItem(true);
    setActionError(null);

    try {
      const res = await createItemAction({
        eventId: event.id,
        section_id: targetSectionId,
        title: itemTitle.trim(),
        quantity: itemQuantity.trim() || null,
        assignee_id: itemAssigneeId || null,
        notes: itemNotes.trim() || null,
      });

      if (res.success && res.data) {
        const newItem = res.data;
        const assignee = newItem.assignee_id
          ? members.find((m) => m.clerk_user_id === newItem.assignee_id)?.profile || null
          : null;

        setSections((prev) =>
          prev.map((sec) =>
            sec.id === targetSectionId
              ? { ...sec, items: [...sec.items, { ...newItem, assignee }] }
              : sec
          )
        );
        setIsAddItemOpen(false);
      } else {
        setActionError(res.error || 'Failed to add item.');
      }
    } catch {
      setActionError('An error occurred adding the checklist item.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleToggleItem = async (itemId: string, nextCompleted: boolean) => {
    if (isLocked) return;

    // Optimistic update
    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        items: sec.items.map((it) =>
          it.id === itemId
            ? {
                ...it,
                is_completed: nextCompleted,
                completed_at: nextCompleted ? new Date().toISOString() : null,
                completed_by: nextCompleted ? currentUserId : null,
              }
            : it
        ),
      }))
    );

    try {
      const res = await toggleItemCompletionAction({
        eventId: event.id,
        itemId,
        isCompleted: nextCompleted,
      });

      if (!res.success) {
        setActionError(res.error || 'Failed to update item state.');
        router.refresh(); // Rollback to authoritative server state
      }
    } catch {
      setActionError('Network error updating item.');
      router.refresh();
    }
  };

  const handleDeleteItem = async (itemId: string, sectionId: string) => {
    if (isLocked) return;

    // Optimistic remove
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId
          ? { ...sec, items: sec.items.filter((it) => it.id !== itemId) }
          : sec
      )
    );

    try {
      const res = await deleteItemAction({
        eventId: event.id,
        itemId,
      });

      if (!res.success) {
        setActionError(res.error || 'Failed to delete item.');
        router.refresh();
      }
    } catch {
      setActionError('Failed to delete item.');
      router.refresh();
    }
  };

  // Template Handlers
  const handleOpenSaveTemplate = () => {
    setTemplateName(`${event.title} Template`);
    setTemplateSuccess(null);
    setIsSaveTemplateOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    setIsSavingTemplate(true);
    setActionError(null);

    try {
      const res = await saveTemplateFromEventAction({
        eventId: event.id,
        templateName: templateName.trim(),
      });

      if (res.success) {
        setTemplateSuccess('Checklist successfully saved as a personal template!');
        setTimeout(() => {
          setIsSaveTemplateOpen(false);
          setTemplateSuccess(null);
        }, 1500);
      } else {
        setActionError(res.error || 'Failed to save template.');
      }
    } catch {
      setActionError('Failed to save template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleOpenApplyTemplate = async () => {
    setIsApplyTemplateOpen(true);
    setIsLoadingTemplates(true);
    setActionError(null);

    try {
      const res = await listUserTemplatesAction();
      if (res.success && res.data) {
        setUserTemplates(res.data);
        if (res.data.length > 0) {
          setSelectedTemplateId(res.data[0].id);
        }
      }
    } catch {
      setActionError('Failed to load personal templates.');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId || isLocked) return;

    setIsApplyingTemplate(true);
    setActionError(null);

    try {
      const res = await applyTemplateToEventAction({
        eventId: event.id,
        templateId: selectedTemplateId,
      });

      if (res.success) {
        setIsApplyTemplateOpen(false);
        router.refresh();
      } else {
        setActionError(res.error || 'Failed to apply template.');
      }
    } catch {
      setActionError('Failed to apply template.');
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Link & Realtime Indicator */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-pine-600)] rounded-md px-1 py-0.5"
        >
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Outings
        </Link>

        <div className="flex items-center gap-2">
          {realtimeStatus === 'connected' && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          )}
          {event.status === 'completed' && (
            <Badge variant="completed">Locked & Completed</Badge>
          )}
          {event.status === 'archived' && (
            <Badge variant="archived">Archived</Badge>
          )}
          {event.status === 'active' && (
            <Badge variant="active">Active Outing</Badge>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-[var(--color-terracotta-200)] bg-[var(--color-terracotta-50)] p-4 text-sm text-[var(--color-terracotta-700)]">
          {actionError}
        </div>
      )}

      {/* Locked Event Banner */}
      {isLocked && <LockedEventBanner />}

      {/* Event Header Card */}
      <div className="rounded-2xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas-card)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-sm text-[var(--color-ink-muted)] max-w-2xl leading-relaxed">
                {event.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-[var(--color-ink-muted)]">
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[var(--color-pine-600)]" />
                  <span>{event.location}</span>
                </div>
              )}

              {(event.start_date || event.end_date) && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[var(--color-pine-600)]" />
                  <span>
                    {event.start_date || 'TBD'}
                    {event.end_date ? ` – ${event.end_date}` : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[var(--color-pine-600)]" />
                <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            {!isLocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInvite}
                className="gap-1.5"
              >
                <Users className="h-4 w-4 text-[var(--color-pine-600)]" />
                Invite
              </Button>
            )}

            {isOwner && !isLocked && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleArchiveToggle}
                  isLoading={isArchiving}
                >
                  {isArchived ? 'Restore' : 'Archive'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCompleteModalOpen(true)}
                  className="border-[var(--color-locked-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Complete Outing
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 pt-6 border-t border-[var(--color-canvas-border)]">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-ink)] mb-2">
            <span>Overall Packing Progress</span>
            <span>
              {completedItems} of {totalItems} items packed ({overallProgressPct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--color-canvas)] border border-[var(--color-canvas-border)] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isLocked ? 'bg-[var(--color-locked-badge)]' : 'bg-[var(--color-pine-600)]'
              }`}
              style={{ width: `${overallProgressPct}%` }}
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 flex border-b border-[var(--color-canvas-border)]">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === 'checklist'
                ? 'border-[var(--color-pine-600)] text-[var(--color-pine-600)]'
                : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Checklist ({totalItems})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === 'members'
                ? 'border-[var(--color-pine-600)] text-[var(--color-pine-600)]'
                : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Participants ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === 'activity'
                ? 'border-[var(--color-pine-600)] text-[var(--color-pine-600)]'
                : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Activity Feed ({activities.length})
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          {/* Section Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Trip Gear & Supplies</h2>

            {!isLocked && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenSaveTemplate}
                  disabled={sections.length === 0}
                  className="gap-1.5"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-pine-600" />
                  Save as Template
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenApplyTemplate}
                  className="gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Apply Template
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setSectionTitle('');
                    setIsAddSectionOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Section
                </Button>
              </div>
            )}
          </div>

          {/* Sections List */}
          {sections.length === 0 ? (
            <EmptyState
              title="No checklist sections yet"
              description="Organize your trip gear by categories such as Camp Kitchen, Sleeping Gear, or Personal Essentials."
              actionLabel={!isLocked ? 'Create First Section' : undefined}
              onAction={!isLocked ? () => setIsAddSectionOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-6">
              {sections.map((section) => {
                const secTotal = section.items.length;
                const secCompleted = section.items.filter((i) => i.is_completed).length;
                const secPct = secTotal > 0 ? Math.round((secCompleted / secTotal) * 100) : 0;

                return (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas-card)] p-5 shadow-xs transition-all"
                  >
                    {/* Section Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--color-canvas-border)]">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[var(--color-pine-600)]" />
                        <h3 className="text-base font-bold text-[var(--color-ink)]">
                          {section.title}
                        </h3>
                        <span className="text-xs text-[var(--color-ink-muted)]">
                          ({secCompleted}/{secTotal} packed, {secPct}%)
                        </span>
                      </div>

                      {!isLocked && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAddItem(section.id)}
                            className="text-xs text-pine-700 hover:bg-pine-50"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add Item
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Items List */}
                    {section.items.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[var(--color-ink-muted)] bg-[var(--color-canvas)]/40 rounded-xl border border-dashed border-[var(--color-canvas-border)]">
                        No items in this section. Click &ldquo;Add Item&rdquo; above.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {section.items.map((item) => (
                          <div key={item.id} className="relative group/row">
                            <ChecklistRow
                              id={item.id}
                              title={item.title}
                              quantity={item.quantity || undefined}
                              notes={item.notes || undefined}
                              assigneeName={
                                item.assignee?.first_name
                                  ? `${item.assignee.first_name} ${item.assignee.last_name || ''}`.trim()
                                  : undefined
                              }
                              assigneeImageUrl={item.assignee?.image_url || undefined}
                              isCompleted={item.is_completed}
                              isEventLocked={isLocked}
                              onToggle={() => handleToggleItem(item.id, !item.is_completed)}
                            />

                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id, section.id)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity p-1.5 text-zinc-400 hover:text-terracotta-600 rounded-md focus:opacity-100"
                                title="Delete Item"
                                aria-label={`Delete ${item.title}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="rounded-2xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas-card)] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[var(--color-ink)]">Trip Participants</h2>
            {!isLocked && (
              <Button size="sm" variant="outline" onClick={handleOpenInvite}>
                Invite Member
              </Button>
            )}
          </div>

          <div className="divide-y divide-[var(--color-canvas-border)]">
            {members.map((m) => {
              const name = m.profile?.first_name
                ? `${m.profile.first_name} ${m.profile.last_name || ''}`.trim()
                : 'Collaborator';
              const isSelf = m.clerk_user_id === currentUserId;

              return (
                <div key={m.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-pine-100)] text-sm font-bold text-[var(--color-pine-700)]">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        {name} {isSelf && <span className="text-xs text-[var(--color-ink-muted)]">(You)</span>}
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        Joined {new Date(m.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Badge variant={m.role === 'owner' ? 'pending' : 'neutral'}>
                    {m.role === 'owner' ? 'Owner' : 'Participant'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="rounded-2xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas-card)] p-6 shadow-sm">
          <h2 className="text-base font-bold text-[var(--color-ink)] mb-4">Activity Log</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">No recorded activity yet.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--color-canvas-border)]">
              {activities.map((a) => (
                <div key={a.id} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-pine-600)] text-white ring-4 ring-[var(--color-canvas-card)]">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {a.event_type === 'event_created' && 'Outing created'}
                      {a.event_type === 'member_joined' && 'New participant joined via invite code'}
                      {a.event_type === 'section_created' && 'Checklist section created'}
                      {a.event_type === 'item_created' && 'Item added to checklist'}
                      {a.event_type === 'item_completed' && 'Item marked complete'}
                      {a.event_type === 'item_uncompleted' && 'Item marked incomplete'}
                      {a.event_type === 'item_deleted' && 'Item removed'}
                      {a.event_type === 'assignment_changed' && 'Item assignment updated'}
                      {a.event_type === 'event_archived' && 'Outing archived'}
                      {a.event_type === 'event_restored' && 'Outing restored to active'}
                      {a.event_type === 'event_completed' && 'Outing marked permanently completed'}
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Section Modal */}
      <Dialog
        isOpen={isAddSectionOpen}
        onClose={() => setIsAddSectionOpen(false)}
        title="Add Checklist Section"
        description="Create a category group for gear (e.g. Sleeping, Cooking, Clothing)."
      >
        <form onSubmit={handleAddSection} className="space-y-4 py-2">
          <Input
            label="Section Title"
            placeholder="e.g. Camp Kitchen"
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddSectionOpen(false)}
              disabled={isSubmittingSection}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmittingSection}
            >
              Create Section
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Add Item Modal */}
      <Dialog
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title="Add Checklist Item"
        description="Add a piece of gear, quantity, and assign a responsible participant."
      >
        <form onSubmit={handleAddItem} className="space-y-3.5 py-1">
          <Input
            label="Item Name"
            placeholder="e.g. Backpacking Stove"
            value={itemTitle}
            onChange={(e) => setItemTitle(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Quantity / Units (Optional)"
            placeholder="e.g. 2 units, 10 meters"
            value={itemQuantity}
            onChange={(e) => setItemQuantity(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              Assignee (Optional)
            </label>
            <select
              value={itemAssigneeId}
              onChange={(e) => setItemAssigneeId(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-pine-600)]"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.clerk_user_id} value={m.clerk_user_id}>
                  {m.profile?.first_name
                    ? `${m.profile.first_name} ${m.profile.last_name || ''}`.trim()
                    : m.clerk_user_id}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Notes / Instructions (Optional)"
            placeholder="e.g. Compatible with screw-on isobutane canisters"
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddItemOpen(false)}
              disabled={isSubmittingItem}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmittingItem}
            >
              Add Item
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Save Template Modal */}
      <Dialog
        isOpen={isSaveTemplateOpen}
        onClose={() => setIsSaveTemplateOpen(false)}
        title="Save as Personal Template"
        description="Creates a reusable checklist template from this outing. Assignees and completion marks are cleared."
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4 py-2">
          {templateSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              {templateSuccess}
            </div>
          )}

          <Input
            label="Template Name"
            placeholder="e.g. 3-Season Backpacking Checklist"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSaveTemplateOpen(false)}
              disabled={isSavingTemplate}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingTemplate}
            >
              Save Template
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Apply Template Modal */}
      <Dialog
        isOpen={isApplyTemplateOpen}
        onClose={() => setIsApplyTemplateOpen(false)}
        title="Apply Checklist Template"
        description="Copies sections and items from your saved templates into this outing. Pre-existing items are safely preserved."
      >
        <div className="space-y-4 py-2">
          {isLoadingTemplates ? (
            <div className="py-6 text-center text-sm text-[var(--color-ink-muted)]">
              Loading your templates...
            </div>
          ) : userTemplates.length === 0 ? (
            <div className="py-4 text-center text-sm text-[var(--color-ink-muted)]">
              No saved templates found. You can save your current checklist as a template once assembled.
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  Select Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-pine-600)]"
                >
                  {userTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.sections.length} sections)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsApplyTemplateOpen(false)}
                  disabled={isApplyingTemplate}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApplyTemplate}
                  isLoading={isApplyingTemplate}
                >
                  Apply to Outing
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>

      {/* Invite Code Dialog */}
      <Dialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Trip Collaborators"
        description="Share this secure 8-character code or join link with your group."
      >
        <div className="space-y-5">
          {isGeneratingInvite ? (
            <div className="py-6 text-center text-sm text-[var(--color-ink-muted)]">
              Generating secure invite code...
            </div>
          ) : inviteCode ? (
            <>
              <div className="rounded-xl border border-[var(--color-pine-200)] bg-[var(--color-pine-50)] p-4 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-pine-700)]">
                  Invite Code
                </span>
                <div className="mt-1 font-mono text-3xl font-bold tracking-widest text-[var(--color-pine-800)]">
                  {inviteCode}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-ink-muted)]">
                  Direct Join Link
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/join/${inviteCode}` : ''}
                    className="flex-1 rounded-xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas)] px-3 py-2 text-xs font-mono text-[var(--color-ink)] focus:outline-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {inviteCopied ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>
              </div>

              {isOwner && (
                <div className="pt-2 border-t border-[var(--color-canvas-border)]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRevokeInvite}
                    className="w-full text-xs text-[var(--color-terracotta-600)] hover:bg-[var(--color-terracotta-50)]"
                  >
                    Revoke This Invite Code
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-sm text-[var(--color-ink-muted)]">
              No active invite code. Click below to generate.
              <div className="mt-3">
                <Button size="sm" onClick={handleOpenInvite}>Generate Code</Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* Complete Event Confirmation Dialog */}
      <Dialog
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Complete & Lock Outing?"
        description="Treat completion as permanent. Once completed, this outing becomes read-only and no participant can add, edit, or check off items."
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--color-locked-border)] bg-[var(--color-locked-surface)] p-3 text-xs text-[var(--color-locked-ink)]">
            <strong>Permanent Action:</strong> In accordance with trip completion rules, reopening is disallowed for this MVP.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsCompleteModalOpen(false)}
              disabled={isCompleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmComplete}
              isLoading={isCompleting}
            >
              Confirm & Lock Outing
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
