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
import { Tabs } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ChecklistRow } from '@/components/ui/checklist-row';
import { AvatarStack } from '@/components/ui/avatar-stack';
import { InlineAlert } from '@/components/ui/inline-alert';
import {
  LockedEventBanner,
  EmptyState,
} from '@/components/ui/state-views';
import {
  Plus,
  BookmarkPlus,
  Layers,
  Sparkles,
  Calendar,
  MapPin,
  Share2,
  CheckCircle2,
  MoreVertical,
  ArrowLeft,
  PackageCheck,
  Send,
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
  const [members, setMembers] = useState(initialMembers);
  const [activities, setActivities] = useState(initialActivities);
  const [sections, setSections] = useState(initialSections);

  // Filter state for checklist: 'all' | 'mine' | 'unassigned'
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'unassigned'>('all');

  // Tabs
  const [activeTab, setActiveTab] = useState<'checklist' | 'members' | 'activity'>('checklist');

  // Dialogs
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isApplyTemplateOpen, setIsApplyTemplateOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Forms
  const [sectionTitle, setSectionTitle] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [itemAssigneeId, setItemAssigneeId] = useState('');
  const [quickAddTitles, setQuickAddTitles] = useState<Record<string, string>>({});

  // Template forms
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [userTemplates, setUserTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Invite state
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Loading/submitting states
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isLocked = event.status === 'completed';
  const isArchived = event.status === 'archived';
  const isOwner = userRole === 'owner';

  // Realtime subscription
  const { status: realtimeStatus } = useEventRealtime({
    eventId: event.id,
    onRefresh: () => {
      router.refresh();
    },
  });

  // Calculate completion
  const totalItems = sections.reduce((acc, sec) => acc + sec.items.length, 0);
  const completedItems = sections.reduce(
    (acc, sec) => acc + sec.items.filter((i) => i.is_completed).length,
    0
  );
  const overallProgressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Handlers
  const handleToggleItem = async (itemId: string, nextCompleted: boolean) => {
    if (isLocked) return;

    // Optimistic UI update
    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        items: sec.items.map((item) =>
          item.id === itemId ? { ...item, is_completed: nextCompleted } : item
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
        setActionError(res.error || 'Failed to update item status');
        router.refresh();
      }
    } catch {
      setActionError('Failed to communicate with server');
      router.refresh();
    }
  };

  const handleDeleteItem = async (itemId: string, sectionId: string) => {
    if (isLocked) return;

    // Optimistic removal
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId
          ? { ...sec, items: sec.items.filter((i) => i.id !== itemId) }
          : sec
      )
    );

    try {
      const res = await deleteItemAction({
        eventId: event.id,
        itemId,
      });
      if (!res.success) {
        setActionError(res.error || 'Failed to delete item');
        router.refresh();
      }
    } catch {
      setActionError('Error deleting item');
      router.refresh();
    }
  };

  const handleQuickAdd = async (sectionId: string) => {
    const title = quickAddTitles[sectionId]?.trim();
    if (!title || isLocked) return;

    // Clear input immediately
    setQuickAddTitles((prev) => ({ ...prev, [sectionId]: '' }));

    try {
      const res = await createItemAction({
        eventId: event.id,
        section_id: sectionId,
        title,
      });

      if (res.success && res.data) {
        setSections((prev) =>
          prev.map((sec) =>
            sec.id === sectionId ? { ...sec, items: [...sec.items, res.data!] } : sec
          )
        );
      } else {
        setActionError(res.error || 'Failed to add item');
      }
    } catch {
      setActionError('Failed to add item');
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim() || isLocked) return;

    setIsSubmittingSection(true);
    setActionError(null);

    try {
      const res = await createSectionAction({
        eventId: event.id,
        title: sectionTitle.trim(),
      });

      if (res.success && res.data) {
        setSections((prev) => [...prev, { ...res.data!, items: [] }]);
        setSectionTitle('');
        setIsAddSectionOpen(false);
      } else {
        setActionError(res.error || 'Failed to add category');
      }
    } catch {
      setActionError('Failed to add category');
    } finally {
      setIsSubmittingSection(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || !selectedSectionId || isLocked) return;

    setIsSubmittingItem(true);
    setActionError(null);

    try {
      const res = await createItemAction({
        eventId: event.id,
        section_id: selectedSectionId,
        title: itemTitle.trim(),
        quantity: itemQuantity.trim() || undefined,
        notes: itemNotes.trim() || undefined,
        assignee_id: itemAssigneeId || undefined,
      });

      if (res.success && res.data) {
        setSections((prev) =>
          prev.map((sec) =>
            sec.id === selectedSectionId
              ? { ...sec, items: [...sec.items, res.data!] }
              : sec
          )
        );
        setItemTitle('');
        setItemQuantity('');
        setItemNotes('');
        setItemAssigneeId('');
        setIsAddItemOpen(false);
      } else {
        setActionError(res.error || 'Failed to add item');
      }
    } catch {
      setActionError('Failed to add item');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleOpenInvite = async () => {
    setIsInviteOpen(true);
    setActionError(null);
    setInviteCopied(false);

    if (!inviteCode) {
      setIsGeneratingInvite(true);
      try {
        const res = await generateInviteCodeAction(event.id);
        if (res.success && res.data) {
          setInviteCode(res.data.invite.invite_code);
        } else {
          setActionError(res.error || 'Failed to create invite code');
        }
      } catch {
        setActionError('Failed to generate invite code');
      } finally {
        setIsGeneratingInvite(false);
      }
    }
  };

  const handleRevokeInvite = async () => {
    if (!inviteCode || !isOwner) return;

    try {
      const res = await revokeInviteCodeAction(inviteCode);
      if (res.success) {
        setInviteCode(null);
        setIsInviteOpen(false);
      } else {
        setActionError(res.error || 'Failed to revoke code');
      }
    } catch {
      setActionError('Failed to revoke code');
    }
  };

  const handleCopyLink = () => {
    if (!inviteCode) return;
    const url = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(url);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  };

  const handleArchiveToggle = async () => {
    if (isLocked) return;
    setIsArchiving(true);
    setActionError(null);

    try {
      if (isArchived) {
        const res = await restoreEventAction(event.id);
        if (res.success && res.data) setEvent(res.data);
      } else {
        const res = await archiveEventAction(event.id);
        if (res.success && res.data) setEvent(res.data);
      }
    } catch {
      setActionError('Failed to update archive status');
    } finally {
      setIsArchiving(false);
      setIsMenuOpen(false);
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
      } else {
        setActionError(res.error || 'Failed to wrap up trip');
      }
    } catch {
      setActionError('Failed to complete trip');
    } finally {
      setIsCompleting(false);
      setIsMenuOpen(false);
    }
  };

  const handleOpenSaveTemplate = () => {
    setTemplateName(`${event.title} Gear Template`);
    setTemplateDesc(`Checklist saved from ${event.title}`);
    setIsSaveTemplateOpen(true);
    setIsMenuOpen(false);
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
        description: templateDesc.trim() || undefined,
      });

      if (res.success) {
        setIsSaveTemplateOpen(false);
      } else {
        setActionError(res.error || 'Failed to save template');
      }
    } catch {
      setActionError('Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleOpenApplyTemplate = async () => {
    setIsApplyTemplateOpen(true);
    setIsMenuOpen(false);
    try {
      const res = await listUserTemplatesAction();
      if (res.success && res.data) {
        setUserTemplates(res.data);
        if (res.data.length > 0) {
          setSelectedTemplateId(res.data[0].id);
        }
      }
    } catch {
      setActionError('Failed to load your templates');
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
        setActionError(res.error || 'Failed to apply template');
      }
    } catch {
      setActionError('Failed to apply template');
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  // Convert member profiles for avatar stack
  const avatarItems = members.map((m) => ({
    id: m.id,
    name: m.profile?.first_name
      ? `${m.profile.first_name} ${m.profile.last_name || ''}`.trim()
      : 'Collaborator',
    imageUrl: m.profile?.image_url,
  }));

  return (
    <div className="space-y-6">
      {/* Back link + Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 rounded-md py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Trips</span>
        </Link>

        <div className="flex items-center gap-2">
          {realtimeStatus === 'connected' && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pine-50 text-pine-700 border border-pine-200 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-pine-600 animate-pulse" />
              Live Sync
            </span>
          )}
          {event.status === 'completed' && (
            <Badge variant="completed">Wrapped Up</Badge>
          )}
          {event.status === 'archived' && (
            <Badge variant="archived">Archived</Badge>
          )}
          {event.status === 'active' && (
            <Badge variant="active">Active Trip</Badge>
          )}
        </div>
      </div>

      {actionError && <InlineAlert type="error" message={actionError} />}
      {isLocked && <LockedEventBanner />}

      {/* Trip Hero Header Card */}
      <div className="rounded-xl border border-canvas-border bg-canvas-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 flex-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-ink">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
                {event.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-ink-muted">
              {event.location && (
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="h-4 w-4 text-pine-600 shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}

              {(event.start_date || event.end_date) && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-pine-600 shrink-0" />
                  <span>
                    {event.start_date || 'TBD'}
                    {event.end_date ? ` – ${event.end_date}` : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <AvatarStack avatars={avatarItems} max={3} size="sm" />
                <span className="font-medium">
                  {members.length} {members.length === 1 ? 'member' : 'in cohort'}
                </span>
              </div>
            </div>
          </div>

          {/* Action cluster with overflow menu */}
          <div className="flex items-center gap-2 pt-2 md:pt-0 shrink-0 relative">
            {!isLocked && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenInvite}
                className="gap-1.5"
              >
                <Share2 className="h-4 w-4" />
                <span>Invite</span>
              </Button>
            )}

            {/* Overflow "⋯" menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Trip actions menu"
                className="touch-target p-2 rounded-lg border border-canvas-border text-ink hover:bg-canvas-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-canvas-border bg-white shadow-lg p-1.5 z-30 flex flex-col gap-1 text-xs">
                  {!isLocked && (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenSaveTemplate}
                        disabled={sections.length === 0}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-canvas-subtle text-ink flex items-center gap-2 disabled:opacity-50"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5 text-pine-600" />
                        <span>Save as Template</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenApplyTemplate}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-canvas-subtle text-ink flex items-center gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Apply Template</span>
                      </button>
                    </>
                  )}

                  {isOwner && !isLocked && (
                    <>
                      <button
                        type="button"
                        onClick={handleArchiveToggle}
                        disabled={isArchiving}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-canvas-subtle text-ink flex items-center gap-2"
                      >
                        <span>{isArchived ? 'Restore Trip' : 'Archive Trip'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCompleteModalOpen(true);
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-pine-50 text-pine-700 font-medium flex items-center gap-2"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Wrap Up Trip</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 pt-6 border-t border-canvas-border">
          <div className="flex items-center justify-between text-xs font-semibold text-ink mb-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-pine-600" />
              <span>Cohort Packing Progress</span>
            </span>
            <span className="font-mono">
              {completedItems} of {totalItems} items packed ({overallProgressPct}%)
            </span>
          </div>
          <Progress
            value={overallProgressPct}
            variant={isLocked ? 'locked' : 'pine'}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6">
          <Tabs
            tabs={[
              { id: 'checklist', label: 'Packing List', count: totalItems },
              { id: 'members', label: 'Cohort Members', count: members.length },
              { id: 'activity', label: 'Activity Feed', count: activities.length },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as 'checklist' | 'members' | 'activity')}
            ariaLabel="Trip Details Navigation"
          />
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          {/* Section Toolbar + My Items Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-card p-3.5 rounded-xl border border-canvas-border">
            {/* Filter modes */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-ink-muted mr-1 font-medium">Show:</span>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-pine-600 text-white'
                    : 'bg-canvas-subtle text-ink hover:bg-canvas-muted'
                }`}
              >
                All Gear
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('mine')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterMode === 'mine'
                    ? 'bg-pine-600 text-white'
                    : 'bg-canvas-subtle text-ink hover:bg-canvas-muted'
                }`}
              >
                My Items
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unassigned')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterMode === 'unassigned'
                    ? 'bg-pine-600 text-white'
                    : 'bg-canvas-subtle text-ink hover:bg-canvas-muted'
                }`}
              >
                Unassigned
              </button>
            </div>

            {!isLocked && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSectionTitle('');
                  setIsAddSectionOpen(true);
                }}
                className="gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </Button>
            )}
          </div>

          {/* Sections List */}
          {sections.length === 0 ? (
            <EmptyState
              title="No packing categories yet"
              description="Organize your gear into groups such as Camp Kitchen, Sleep Systems, or Navigation & Safety."
              actionLabel={!isLocked ? 'Add First Category' : undefined}
              onAction={!isLocked ? () => setIsAddSectionOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-6">
              {sections.map((section) => {
                // Apply filter
                const filteredItems = section.items.filter((item) => {
                  if (filterMode === 'mine') return item.assignee_id === currentUserId;
                  if (filterMode === 'unassigned') return !item.assignee_id;
                  return true;
                });

                const secTotal = section.items.length;
                const secCompleted = section.items.filter((i) => i.is_completed).length;
                const secPct = secTotal > 0 ? Math.round((secCompleted / secTotal) * 100) : 0;

                return (
                  <div
                    key={section.id}
                    className="rounded-xl border border-canvas-border bg-canvas-card p-5 transition-all"
                  >
                    {/* Section Header */}
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-canvas-border">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-pine-600" />
                        <h2 className="text-base font-serif font-bold text-ink">
                          {section.title}
                        </h2>
                        <span className="text-xs text-ink-muted font-mono">
                          ({secCompleted}/{secTotal})
                        </span>
                      </div>

                      {!isLocked && (
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => {
                            setSelectedSectionId(section.id);
                            setIsAddItemOpen(true);
                          }}
                          className="text-xs text-pine-700"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Details
                        </Button>
                      )}
                    </div>

                    {/* Items List */}
                    {filteredItems.length === 0 ? (
                      <div className="p-4 text-center text-xs text-ink-muted bg-canvas-subtle/30 rounded-xl border border-dashed border-canvas-border">
                        {filterMode === 'all'
                          ? 'No gear items yet in this category.'
                          : `No items matching "${filterMode}" in this category.`}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredItems.map((item) => (
                          <ChecklistRow
                            key={item.id}
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
                            onDelete={() => handleDeleteItem(item.id, section.id)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Inline Quick Add Input (Typing into a list) */}
                    {!isLocked && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleQuickAdd(section.id);
                        }}
                        className="mt-3 pt-3 border-t border-canvas-border/50 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          placeholder="Quick add item (e.g. Camp stove, 2x fuel)..."
                          value={quickAddTitles[section.id] || ''}
                          onChange={(e) =>
                            setQuickAddTitles((prev) => ({
                              ...prev,
                              [section.id]: e.target.value,
                            }))
                          }
                          className="flex-1 bg-transparent px-3 py-1.5 text-sm rounded-lg border border-transparent hover:border-canvas-border focus:border-pine-600 focus:bg-white focus:outline-none transition-colors"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          disabled={!quickAddTitles[section.id]?.trim()}
                          aria-label="Add item"
                        >
                          <Send className="w-3.5 h-3.5 text-pine-600" />
                        </Button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cohort Members Tab */}
      {activeTab === 'members' && (
        <div className="rounded-xl border border-canvas-border bg-canvas-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-serif font-bold text-ink">Expedition Cohort</h2>
              <p className="text-xs text-ink-muted">Friends and travelers sharing this packing list.</p>
            </div>
            {!isLocked && (
              <Button size="sm" variant="outline" onClick={handleOpenInvite}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Invite Member
              </Button>
            )}
          </div>

          <div className="divide-y divide-canvas-border">
            {members.map((m) => {
              const name = m.profile?.first_name
                ? `${m.profile.first_name} ${m.profile.last_name || ''}`.trim()
                : 'Collaborator';
              const isSelf = m.clerk_user_id === currentUserId;

              return (
                <div key={m.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pine-100 text-sm font-bold text-pine-700">
                      {m.profile?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.profile.image_url}
                          alt={name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {name} {isSelf && <span className="text-xs text-ink-muted">(You)</span>}
                      </p>
                      <p className="text-xs text-ink-muted">
                        Joined {new Date(m.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Badge variant={m.role === 'owner' ? 'pending' : 'neutral'}>
                    {m.role === 'owner' ? 'Organizer' : 'Participant'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <div className="rounded-xl border border-canvas-border bg-canvas-card p-6">
          <h2 className="text-base font-serif font-bold text-ink mb-1">Trip Timeline</h2>
          <p className="text-xs text-ink-muted mb-5">Audit trail of group updates and packing progress.</p>
          {activities.length === 0 ? (
            <p className="text-sm text-ink-muted italic">No recorded activity yet.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-canvas-border">
              {activities.map((a) => (
                <div key={a.id} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-pine-600 text-white ring-4 ring-canvas-card">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {a.event_type === 'event_created' && 'Trip created'}
                      {a.event_type === 'member_joined' && 'New participant joined cohort'}
                      {a.event_type === 'section_created' && 'Packing category added'}
                      {a.event_type === 'item_created' && 'Item added to packing list'}
                      {a.event_type === 'item_completed' && 'Item packed & checked off'}
                      {a.event_type === 'item_uncompleted' && 'Item marked unpacked'}
                      {a.event_type === 'item_deleted' && 'Item removed'}
                      {a.event_type === 'assignment_changed' && 'Item assignment updated'}
                      {a.event_type === 'event_archived' && 'Trip archived'}
                      {a.event_type === 'event_restored' && 'Trip restored to active'}
                      {a.event_type === 'event_completed' && 'Trip successfully wrapped up'}
                    </p>
                    <p className="text-xs text-ink-muted">
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
        title="Add Packing Category"
        description="Create a category group for gear (e.g. Camp Kitchen, Sleep Systems, First Aid)."
      >
        <form onSubmit={handleAddSection} className="space-y-4 py-1">
          <Input
            label="Category Name"
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
              Create Category
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Add Item Modal */}
      <Dialog
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title="Add Gear Details"
        description="Configure quantity, notes, and assign responsibility."
      >
        <form onSubmit={handleAddItem} className="space-y-3.5 py-1">
          <Input
            label="Gear / Item Name"
            placeholder="e.g. 2-Burner Propane Stove"
            value={itemTitle}
            onChange={(e) => setItemTitle(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Quantity / Units (Optional)"
            placeholder="e.g. 2 units, 1 canister"
            value={itemQuantity}
            onChange={(e) => setItemQuantity(e.target.value)}
          />

          <Input
            label="Notes / Specs (Optional)"
            placeholder="e.g. Bring extra windscreen, 16oz fuel"
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
          />

          <div className="space-y-1.5">
            <label htmlFor="assignee-select" className="text-xs font-medium text-ink">
              Assign Responsible Member
            </label>
            <select
              id="assignee-select"
              value={itemAssigneeId}
              onChange={(e) => setItemAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-canvas-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-pine-600"
            >
              <option value="">Unassigned (Anyone can pack)</option>
              {members.map((m) => (
                <option key={m.id} value={m.clerk_user_id}>
                  {m.profile?.first_name
                    ? `${m.profile.first_name} ${m.profile.last_name || ''}`.trim()
                    : m.clerk_user_id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
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
              Save Item
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Save Template Modal */}
      <Dialog
        isOpen={isSaveTemplateOpen}
        onClose={() => setIsSaveTemplateOpen(false)}
        title="Save as Personal Template"
        description="Preserve this trip's checklist structure to reuse for future adventures."
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4 py-1">
          <Input
            label="Template Name"
            placeholder="e.g. Weekend Camping Essentials"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Standard 3-day car camping packing list"
            value={templateDesc}
            onChange={(e) => setTemplateDesc(e.target.value)}
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
        description="Add sections and items from one of your saved templates into this trip."
      >
        <div className="space-y-4 py-1">
          {userTemplates.length === 0 ? (
            <div className="py-4 text-center text-sm text-ink-muted">
              You haven&apos;t saved any templates yet. Create templates from the Templates tab.
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="template-select" className="text-xs font-medium text-ink">
                  Select Template
                </label>
                <select
                  id="template-select"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-lg border border-canvas-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-pine-600"
                >
                  {userTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsApplyTemplateOpen(false)}
                  disabled={isApplyingTemplate}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleApplyTemplate}
                  isLoading={isApplyingTemplate}
                >
                  Apply to Trip
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
        description="Share this secure 8-character code or direct join link with your cohort."
      >
        <div className="space-y-5">
          {isGeneratingInvite ? (
            <div className="py-6 text-center text-sm text-ink-muted">
              Generating secure invite code...
            </div>
          ) : inviteCode ? (
            <>
              <div className="rounded-xl border border-pine-200 bg-pine-50 p-4 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-pine-700">
                  Cohort Invite Code
                </span>
                <div className="mt-1 font-mono text-3xl font-bold tracking-widest text-pine-800">
                  {inviteCode}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-muted">
                  Direct Join Link
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/join/${inviteCode}` : ''}
                    className="flex-1 rounded-lg border border-canvas-border bg-canvas px-3 py-2 text-xs font-mono text-ink focus:outline-none"
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
                <div className="pt-2 border-t border-canvas-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRevokeInvite}
                    className="w-full text-xs text-terracotta-600 hover:bg-terracotta-50"
                  >
                    Revoke This Invite Code
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-sm text-ink-muted">
              No active invite code. Click below to generate.
              <div className="mt-3">
                <Button size="sm" onClick={handleOpenInvite}>Generate Code</Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* Wrap Up Confirmation Dialog (Positive Recap) */}
      <Dialog
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Wrap Up & Lock Trip"
        description="Ready to head out on the trail? Wrapping up seals your packing list as a permanent expedition record."
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-canvas-border bg-canvas-subtle p-4 space-y-2 text-xs text-ink">
            <h4 className="font-semibold text-sm">Expedition Summary:</h4>
            <div className="flex justify-between">
              <span className="text-ink-muted">Total gear packed:</span>
              <span className="font-mono font-bold">{completedItems} of {totalItems} items ({overallProgressPct}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Cohort size:</span>
              <span className="font-mono font-bold">{members.length} members</span>
            </div>
            <p className="pt-2 text-ink-muted text-xs border-t border-canvas-border/60">
              Once wrapped up, this checklist becomes a permanent read-only log.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsCompleteModalOpen(false)}
              disabled={isCompleting}
            >
              Keep Editing
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmComplete}
              isLoading={isCompleting}
            >
              Wrap Up Trip
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
