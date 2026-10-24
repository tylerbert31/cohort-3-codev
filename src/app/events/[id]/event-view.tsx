'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from '@/types/database';
import {
  archiveEventAction,
  restoreEventAction,
  completeEventAction,
  getEventDetailsAction,
} from '@/server/actions/events';
import { generateInviteCodeAction, revokeInviteCodeAction } from '@/server/actions/invitations';
import {
  createSectionAction,
  createItemAction,
  updateItemAction,
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
  initialUnsectionedItems?: (ChecklistItem & { assignee?: Profile | null })[];
  userRole: 'owner' | 'participant';
  currentUserId: string;
}

export default function EventView({
  initialEvent,
  initialMembers,
  initialActivities,
  initialSections,
  initialUnsectionedItems,
  userRole,
  currentUserId,
}: EventViewProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event>(initialEvent);
  const [members, setMembers] = useState(initialMembers);
  const [activities, setActivities] = useState(initialActivities);
  const [sections, setSections] = useState(initialSections);
  const [unsectionedItems, setUnsectionedItems] = useState<
    (ChecklistItem & { assignee?: Profile | null })[]
  >(initialUnsectionedItems || []);

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
  const [itemDeadline, setItemDeadline] = useState('');

  // Item edit modal state (mobile & desktop)
  const [editingItem, setEditingItem] = useState<(ChecklistItem & { assignee?: Profile | null }) | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [isSubmittingEditItem, setIsSubmittingEditItem] = useState(false);
  const [isDeletingEditItem, setIsDeletingEditItem] = useState(false);
  const [quickAddTitles, setQuickAddTitles] = useState<Record<string, string>>({});
  const [quickAddDirectTitle, setQuickAddDirectTitle] = useState('');

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

  // Synchronize internal state with server props when updated
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvent(initialEvent);
    setMembers(initialMembers);
    setActivities(initialActivities);
    setSections(initialSections);
    setUnsectionedItems(initialUnsectionedItems || []);
  }, [initialEvent, initialMembers, initialActivities, initialSections, initialUnsectionedItems]);

  // Full refresh helper that pulls fresh data and updates state
  const refreshEventData = useCallback(async () => {
    try {
      const res = await getEventDetailsAction(event.id);
      if (res.success && res.data) {
        setEvent(res.data.event);
        setMembers(res.data.members);
        setActivities(res.data.activities);
        setSections(res.data.sections);
        setUnsectionedItems(res.data.unsectionedItems);
      }
    } catch (err) {
      console.error('Failed to refresh event data:', err);
    }
    router.refresh();
  }, [event.id, router]);

  // Realtime subscription (WebSockets + BroadcastChannel)
  const { status: realtimeStatus, broadcastUpdate } = useEventRealtime({
    eventId: event.id,
    onRefresh: refreshEventData,
  });

  // Calculate completion
  const totalSectionItems = sections.reduce((acc, sec) => acc + sec.items.length, 0);
  const totalItems = totalSectionItems + unsectionedItems.length;

  const completedSectionItems = sections.reduce(
    (acc, sec) => acc + sec.items.filter((i) => i.is_completed).length,
    0
  );
  const completedItems =
    completedSectionItems + unsectionedItems.filter((i) => i.is_completed).length;

  const overallProgressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Handlers
  const handleToggleItem = async (itemId: string, nextCompleted: boolean) => {
    if (isLocked) return;

    // Optimistic UI update for sections
    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        items: sec.items.map((item) =>
          item.id === itemId ? { ...item, is_completed: nextCompleted } : item
        ),
      }))
    );


    // Optimistic UI update for unsectioned items
    setUnsectionedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, is_completed: nextCompleted } : item
      )
    );

    try {
      const res = await toggleItemCompletionAction({
        eventId: event.id,
        itemId,
        isCompleted: nextCompleted,
      });
      if (!res.success) {
        setActionError(res.error || 'Failed to update item status');
        refreshEventData();
      } else {
        broadcastUpdate();
      }
    } catch {
      setActionError('Failed to communicate with server');
      refreshEventData();
    }
  };

  const handleDeleteItem = async (itemId: string, sectionId?: string | null) => {
    if (isLocked) return;

    // Optimistic removal
    if (sectionId) {
      setSections((prev) =>
        prev.map((sec) =>
          sec.id === sectionId
            ? { ...sec, items: sec.items.filter((i) => i.id !== itemId) }
            : sec
        )
      );
    } else {
      setUnsectionedItems((prev) => prev.filter((i) => i.id !== itemId));
    }

    try {
      const res = await deleteItemAction({
        eventId: event.id,
        itemId,
      });
      if (!res.success) {
        setActionError(res.error || 'Failed to delete item');
        refreshEventData();
      } else {
        broadcastUpdate();
      }
    } catch {
      setActionError('Error deleting item');
      refreshEventData();
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
        const newItem = res.data;
        const assignee = newItem.assignee_id
          ? members.find((m) => m.clerk_user_id === newItem.assignee_id)?.profile || null
          : null;

        setSections((prev) =>
          prev.map((sec) =>
            sec.id === sectionId ? { ...sec, items: [...sec.items, { ...newItem, assignee }] } : sec
          )
        );
        broadcastUpdate();
      } else {
        setActionError(res.error || 'Failed to add item');
      }
    } catch {
      setActionError('Failed to add item');
    }
  };

  const handleQuickAddDirect = async () => {
    const title = quickAddDirectTitle.trim();
    if (!title || isLocked) return;

    setQuickAddDirectTitle('');

    try {
      const res = await createItemAction({
        eventId: event.id,
        section_id: null,
        title,
      });

      if (res.success && res.data) {
        const newItem = res.data;
        const assignee = newItem.assignee_id
          ? members.find((m) => m.clerk_user_id === newItem.assignee_id)?.profile || null
          : null;

        setUnsectionedItems((prev) => [...prev, { ...newItem, assignee }]);
        broadcastUpdate();
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
        broadcastUpdate();
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
    if (!itemTitle.trim() || isLocked) return;

    setIsSubmittingItem(true);
    setActionError(null);

    try {
      const res = await createItemAction({
        eventId: event.id,
        section_id: selectedSectionId || null,
        title: itemTitle.trim(),
        quantity: itemQuantity.trim() || undefined,
        notes: itemNotes.trim() || undefined,
        assignee_id: itemAssigneeId || undefined,
        deadline: itemDeadline ? itemDeadline : undefined,
      });

      if (res.success && res.data) {
        const newItem = res.data;
        const assignee = newItem.assignee_id
          ? members.find((m) => m.clerk_user_id === newItem.assignee_id)?.profile || null
          : null;
        const itemWithAssignee = { ...newItem, assignee };

        if (selectedSectionId) {
          setSections((prev) =>
            prev.map((sec) =>
              sec.id === selectedSectionId
                ? { ...sec, items: [...sec.items, itemWithAssignee] }
                : sec
            )
          );
        } else {
          setUnsectionedItems((prev) => [...prev, itemWithAssignee]);
        }
        setItemTitle('');
        setItemQuantity('');
        setItemNotes('');
        setItemAssigneeId('');
        setItemDeadline('');
        setIsAddItemOpen(false);
        broadcastUpdate();
      } else {
        setActionError(res.error || 'Failed to add item');
      }
    } catch {
      setActionError('Failed to add item');
    } finally {
      setIsSubmittingItem(false);
    }
  };
  const handleOpenEditItem = (item: ChecklistItem & { assignee?: Profile | null }) => {
    if (isLocked) return;
    setEditingItem(item);
    setEditTitle(item.title);
    setEditQuantity(item.quantity || '');
    setEditNotes(item.notes || '');
    setEditAssigneeId(item.assignee_id || '');
    setEditDeadline(item.deadline ? item.deadline.split('T')[0] : '');
    setEditSectionId(item.section_id || null);
    setActionError(null);
  };

  const handleCloseEditItem = () => {
    setEditingItem(null);
    setIsSubmittingEditItem(false);
    setIsDeletingEditItem(false);
  };

  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim() || isLocked) return;

    setIsSubmittingEditItem(true);
    setActionError(null);

    const oldSectionId = editingItem.section_id || null;
    const newSectionId = editSectionId || null;

    try {
      const res = await updateItemAction({
        eventId: event.id,
        itemId: editingItem.id,
        title: editTitle.trim(),
        quantity: editQuantity.trim() || null,
        notes: editNotes.trim() || null,
        assignee_id: editAssigneeId || null,
        deadline: editDeadline ? editDeadline : null,
        section_id: newSectionId,
      });

      if (res.success && res.data) {
        const updated = res.data;
        const assignee = updated.assignee_id
          ? members.find((m) => m.clerk_user_id === updated.assignee_id)?.profile || null
          : null;
        const updatedWithAssignee = { ...updated, assignee };

        if (oldSectionId !== newSectionId) {
          // Remove from old
          if (oldSectionId) {
            setSections((prev) =>
              prev.map((sec) =>
                sec.id === oldSectionId
                  ? { ...sec, items: sec.items.filter((i) => i.id !== updated.id) }
                  : sec
              )
            );
          } else {
            setUnsectionedItems((prev) => prev.filter((i) => i.id !== updated.id));
          }

          // Add to new
          if (newSectionId) {
            setSections((prev) =>
              prev.map((sec) =>
                sec.id === newSectionId
                  ? { ...sec, items: [...sec.items, updatedWithAssignee] }
                  : sec
              )
            );
          } else {
            setUnsectionedItems((prev) => [...prev, updatedWithAssignee]);
          }
        } else {
          // Update in place
          if (newSectionId) {
            setSections((prev) =>
              prev.map((sec) =>
                sec.id === newSectionId
                  ? {
                      ...sec,
                      items: sec.items.map((i) =>
                        i.id === updated.id ? updatedWithAssignee : i
                      ),
                    }
                  : sec
              )
            );
          } else {
            setUnsectionedItems((prev) =>
              prev.map((i) => (i.id === updated.id ? updatedWithAssignee : i))
            );
          }
        }

        handleCloseEditItem();
        broadcastUpdate();
      } else {
        setActionError(res.error || 'Failed to update item');
      }
    } catch {
      setActionError('Failed to update item');
    } finally {
      setIsSubmittingEditItem(false);
    }
  };

  const handleDeleteFromEditModal = async () => {
    if (!editingItem || isLocked) return;
    setIsDeletingEditItem(true);
    await handleDeleteItem(editingItem.id, editingItem.section_id);
    handleCloseEditItem();
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
        broadcastUpdate();
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
        if (res.success && res.data) {
          setEvent(res.data);
          broadcastUpdate();
        }
      } else {
        const res = await archiveEventAction(event.id);
        if (res.success && res.data) {
          setEvent(res.data);
          broadcastUpdate();
        }
      }
    } catch {
      setActionError('Failed to update archive status');
    } finally {
      setIsArchiving(false);
      setIsMenuOpen(false);
    }
  };

  const handleConfirmComplete = async () => {
    if (isLocked || !isOwner) return;
    setIsCompleting(true);
    setActionError(null);

    try {
      const res = await completeEventAction(event.id);
      if (res.success && res.data) {
        setEvent(res.data);
        setIsCompleteModalOpen(false);
        broadcastUpdate();
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
        await refreshEventData();
        broadcastUpdate();
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

  // Filtered direct items
  const filteredUnsectionedItems = unsectionedItems.filter((item) => {
    if (filterMode === 'mine') return item.assignee_id === currentUserId;
    if (filterMode === 'unassigned') return !item.assignee_id;
    return true;
  });

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
                        disabled={totalItems === 0}
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
              <div className="flex items-center gap-2">
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

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setSelectedSectionId(null);
                    setItemTitle('');
                    setItemQuantity('');
                    setItemNotes('');
                    setItemAssigneeId('');
                    setIsAddItemOpen(true);
                  }}
                  className="gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </Button>
              </div>
            )}
          </div>

          {/* Sections & Direct Items List */}
          {sections.length === 0 && unsectionedItems.length === 0 ? (
            <EmptyState
              title="No packing items yet"
              description="Add items directly to this trip, or organize your gear into categories such as Camp Kitchen or Sleep Systems."
              actionLabel={!isLocked ? 'Add First Item' : undefined}
              onAction={
                !isLocked
                  ? () => {
                      setSelectedSectionId(null);
                      setItemTitle('');
                      setItemQuantity('');
                      setItemNotes('');
                      setItemAssigneeId('');
                      setIsAddItemOpen(true);
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-6">
              {/* Direct Unsectioned Items Card */}
              {unsectionedItems.length > 0 && (
                <div className="rounded-xl border border-canvas-border bg-canvas-card p-5 transition-all">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-canvas-border">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-pine-600" />
                      <h2 className="text-base font-serif font-bold text-ink">
                        {sections.length > 0 ? 'General Items (No Category)' : 'Checklist Items'}
                      </h2>
                      <span className="text-xs text-ink-muted font-mono">
                        ({unsectionedItems.filter((i) => i.is_completed).length}/{unsectionedItems.length})
                      </span>
                    </div>

                    {!isLocked && (
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() => {
                          setSelectedSectionId(null);
                          setItemTitle('');
                          setItemQuantity('');
                          setItemNotes('');
                          setItemAssigneeId('');
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
                  {filteredUnsectionedItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-ink-muted bg-canvas-subtle/30 rounded-xl border border-dashed border-canvas-border">
                      {filterMode === 'all'
                        ? 'No direct items yet.'
                        : `No direct items matching "${filterMode}".`}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredUnsectionedItems.map((item) => (
                        <ChecklistRow
                          key={item.id}
                          id={item.id}
                          title={item.title}
                          quantity={item.quantity || undefined}
                          notes={item.notes || undefined}
                          deadline={item.deadline}
                          assigneeName={
                            item.assignee?.first_name
                              ? `${item.assignee.first_name} ${item.assignee.last_name || ''}`.trim()
                              : undefined
                          }
                          assigneeImageUrl={item.assignee?.image_url || undefined}
                          isCompleted={item.is_completed}
                          isEventLocked={isLocked}
                          onToggle={() => handleToggleItem(item.id, !item.is_completed)}
                          onSelect={() => handleOpenEditItem(item)}
                          onDelete={() => handleDeleteItem(item.id, null)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Inline Quick Add Input */}
                  {!isLocked && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleQuickAddDirect();
                      }}
                      className="mt-3 pt-3 border-t border-canvas-border/50 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Quick add item (e.g. Park pass, Map, Sunscreen)..."
                        value={quickAddDirectTitle}
                        onChange={(e) => setQuickAddDirectTitle(e.target.value)}
                        className="flex-1 bg-transparent px-3 py-1.5 text-sm rounded-lg border border-transparent hover:border-canvas-border focus:border-pine-600 focus:bg-white focus:outline-none transition-colors"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        disabled={!quickAddDirectTitle.trim()}
                        aria-label="Add item"
                      >
                        <Send className="w-3.5 h-3.5 text-pine-600" />
                      </Button>
                    </form>
                  )}
                </div>
              )}

              {/* Categorized Sections List */}
              {sections.map((section) => {
                // Apply filter
                const filteredItems = section.items.filter((item) => {
                  if (filterMode === 'mine') return item.assignee_id === currentUserId;
                  if (filterMode === 'unassigned') return !item.assignee_id;
                  return true;
                });

                const secTotal = section.items.length;
                const secCompleted = section.items.filter((i) => i.is_completed).length;

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
                            deadline={item.deadline}
                            assigneeName={
                              item.assignee?.first_name
                                ? `${item.assignee.first_name} ${item.assignee.last_name || ''}`.trim()
                                : undefined
                            }
                            assigneeImageUrl={item.assignee?.image_url || undefined}
                            isCompleted={item.is_completed}
                            isEventLocked={isLocked}
                            onToggle={() => handleToggleItem(item.id, !item.is_completed)}
                            onSelect={() => handleOpenEditItem(item)}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Quantity / Units (Optional)"
              placeholder="e.g. 2 units, 1 canister"
              value={itemQuantity}
              onChange={(e) => setItemQuantity(e.target.value)}
            />
            <div className="space-y-1.5">
              <label htmlFor="item-deadline-input" className="text-xs font-medium text-ink flex items-center justify-between">
                <span>Deadline (Optional)</span>
                {itemDeadline && (
                  <button
                    type="button"
                    onClick={() => setItemDeadline('')}
                    className="text-[11px] text-terracotta-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </label>
              <input
                id="item-deadline-input"
                type="date"
                value={itemDeadline}
                onChange={(e) => setItemDeadline(e.target.value)}
                className="w-full rounded-lg border border-canvas-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-pine-600"
              />
            </div>
          </div>

          {sections.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="category-select" className="text-xs font-medium text-ink">
                Category (Optional)
              </label>
              <select
                id="category-select"
                value={selectedSectionId || ''}
                onChange={(e) => setSelectedSectionId(e.target.value || null)}
                className="w-full rounded-lg border border-canvas-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-pine-600"
              >
                <option value="">No Category (Direct Item)</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.title}
                  </option>
                ))}
              </select>
            </div>
          )}
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

      {/* Edit Gear Item Modal (Mobile & Desktop Popup) */}
      <Dialog
        isOpen={Boolean(editingItem)}
        onClose={handleCloseEditItem}
        title="Edit Gear Item"
        description="Modify name, assignment, deadline, and specs."
      >
        {editingItem && (
          <form onSubmit={handleSaveEditItem} className="space-y-3.5 py-1">
            <Input
              label="Gear / Item Name"
              placeholder="e.g. 2-Burner Propane Stove"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              autoFocus
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Quantity / Units (Optional)"
                placeholder="e.g. 2 units, 1 canister"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
              />

              <div className="space-y-1.5">
                <label htmlFor="edit-item-deadline" className="text-xs font-medium text-ink flex items-center justify-between">
                  <span>Deadline (Optional)</span>
                  {editDeadline && (
                    <button
                      type="button"
                      onClick={() => setEditDeadline('')}
                      className="text-[11px] text-terracotta-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </label>
                <input
                  id="edit-item-deadline"
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full rounded-lg border border-canvas-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-pine-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-assignee-select" className="text-xs font-medium text-ink">
                Assign Responsible Member
              </label>
              <select
                id="edit-assignee-select"
                value={editAssigneeId}
                onChange={(e) => setEditAssigneeId(e.target.value)}
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

            {sections.length > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="edit-category-select" className="text-xs font-medium text-ink">
                  Category (Optional)
                </label>
                <select
                  id="edit-category-select"
                  value={editSectionId || ''}
                  onChange={(e) => setEditSectionId(e.target.value || null)}
                  className="w-full rounded-lg border border-canvas-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-pine-600"
                >
                  <option value="">No Category (Direct Item)</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Input
              label="Notes / Specs (Optional)"
              placeholder="e.g. Bring extra windscreen, 16oz fuel"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />

            <div className="flex items-center justify-between pt-3 border-t border-canvas-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-terracotta-600 hover:text-terracotta-700 hover:bg-terracotta-50"
                onClick={handleDeleteFromEditModal}
                disabled={isDeletingEditItem || isSubmittingEditItem}
              >
                {isDeletingEditItem ? 'Deleting...' : 'Delete Item'}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseEditItem}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmittingEditItem}
                  disabled={!editTitle.trim()}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        )}
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
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-pine-600 border-t-transparent mx-auto mb-2" />
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
                    variant={inviteCopied ? 'primary' : 'outline'}
                    onClick={handleCopyLink}
                  >
                    {inviteCopied ? 'Copied!' : 'Copy'}
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
              type="button"
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
