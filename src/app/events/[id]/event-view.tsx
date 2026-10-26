'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/query';
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
  deleteSectionAction,
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
  Trash2,
  AlertCircle,
  X,
  Compass,
} from 'lucide-react';

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return dateStr;
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTripDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate && !endDate) return 'Dates TBD';
  if (startDate && !endDate) return formatDisplayDate(startDate);
  if (!startDate && endDate) return `Until ${formatDisplayDate(endDate)}`;
  return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
}

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
  const queryClient = useQueryClient();
  const invalidateEventsList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
  }, [queryClient]);

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
  const [sectionToDelete, setSectionToDelete] = useState<(ChecklistSection & { items: ChecklistItem[] }) | null>(null);
  const [deleteSectionKeepItems, setDeleteSectionKeepItems] = useState(true);
  const [isDeletingSection, setIsDeletingSection] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isApplyTemplateOpen, setIsApplyTemplateOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuContentRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 12,
    left: 12,
    width: 224,
    maxHeight: 320,
    ready: false,
  });

  const updateMenuPosition = useCallback(() => {
    const trigger = menuButtonRef.current;
    const menu = menuContentRef.current;
    if (!trigger || !menu) return;

    const viewportPadding = 12;
    const gap = 8;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(240, window.innerWidth - viewportPadding * 2);
    const viewportHeight = window.innerHeight;
    const contentHeight = Math.min(
      menu.scrollHeight,
      viewportHeight - viewportPadding * 2
    );
    const belowSpace = Math.max(
      0,
      viewportHeight - rect.bottom - gap - viewportPadding
    );
    const aboveSpace = Math.max(0, rect.top - gap - viewportPadding);
    const openAbove = belowSpace < contentHeight && aboveSpace > belowSpace;
    const availableSpace = openAbove ? aboveSpace : belowSpace;
    const maxHeight = Math.max(1, Math.min(contentHeight, availableSpace));
    const top = openAbove
      ? rect.top - gap - maxHeight
      : rect.bottom + gap;
    const left = Math.min(
      window.innerWidth - width - viewportPadding,
      Math.max(viewportPadding, rect.right - width)
    );

    setMenuPosition({ top, left, width, maxHeight, ready: true });
  }, []);

  // Progressive disclosure quick-add active container ('unsectioned' or section ID)
  const [activeQuickAddSection, setActiveQuickAddSection] = useState<string | null>(null);

  // Item deletion confirmation modal
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    title: string;
    sectionId?: string | null;
  } | null>(null);
  const todayDateString = getTodayDateString();

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

  // Portaled action menu: position against the trigger and keep it within the viewport.
  useEffect(() => {
    if (!isMenuOpen) {
      setMenuPosition((current) =>
        current.ready ? { ...current, ready: false } : current
      );
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      updateMenuPosition();
    });

    const handleViewportChange = () => updateMenuPosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || menuContentRef.current?.contains(target)) {
        return;
      }
      setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen, updateMenuPosition]);

  // Focus a menu item only after the portal has been positioned and made visible.
  useEffect(() => {
    if (!isMenuOpen || !menuPosition.ready) return;

    const frame = window.requestAnimationFrame(() => {
      menuContentRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isMenuOpen, menuPosition.ready]);

  // Auto-dismiss transient action errors after 6s
  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => {
      setActionError(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [actionError]);

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
        invalidateEventsList();
      }
    } catch (err) {
      console.error('Failed to refresh event data:', err);
    }
    router.refresh();
  }, [event.id, invalidateEventsList, router]);

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
  const hasExistingItemsOrCategories = sections.length > 0 || totalItems > 0;

  // Filter counts for segmented control
  const allItemsList = [
    ...sections.flatMap((s) => s.items),
    ...unsectionedItems,
  ];
  const mineCount = allItemsList.filter((i) => i.assignee_id === currentUserId).length;
  const unassignedCount = allItemsList.filter((i) => !i.assignee_id).length;

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
        invalidateEventsList();
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
        invalidateEventsList();
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
        invalidateEventsList();
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

  const handleOpenDeleteSection = (sec: ChecklistSection & { items: ChecklistItem[] }) => {
    if (isLocked) return;
    setSectionToDelete(sec);
    setDeleteSectionKeepItems(true);
    setActionError(null);
  };

  const handleCloseDeleteSection = () => {
    setSectionToDelete(null);
    setIsDeletingSection(false);
  };

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete || isLocked) return;

    setIsDeletingSection(true);
    setActionError(null);

    const targetSectionId = sectionToDelete.id;
    const itemsToMove = sectionToDelete.items;
    const shouldKeepItems = deleteSectionKeepItems;

    try {
      const res = await deleteSectionAction({
        eventId: event.id,
        sectionId: targetSectionId,
        keepItems: shouldKeepItems,
      });

      if (res.success) {
        setSections((prev) => prev.filter((s) => s.id !== targetSectionId));

        if (shouldKeepItems && itemsToMove.length > 0) {
          const unsectionedConverted = itemsToMove.map((i) => ({
            ...i,
            section_id: null,
          }));
          setUnsectionedItems((prev) => [...prev, ...unsectionedConverted]);
        }

        handleCloseDeleteSection();
        invalidateEventsList();
        broadcastUpdate();
      } else {
        setActionError(res.error || 'Failed to remove category');
      }
    } catch {
      setActionError('Failed to remove category');
    } finally {
      setIsDeletingSection(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || isLocked) return;

    if (itemDeadline && itemDeadline < todayDateString) {
      setActionError('Deadline cannot be in the past.');
      return;
    }

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
        invalidateEventsList();
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

    if (
      editDeadline &&
      editDeadline < todayDateString &&
      editDeadline !== editingItem.deadline?.split('T')[0]
    ) {
      setActionError('Deadline cannot be in the past.');
      return;
    }

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
        invalidateEventsList();
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
          invalidateEventsList();
          broadcastUpdate();
        }
      } else {
        const res = await archiveEventAction(event.id);
        if (res.success && res.data) {
          setEvent(res.data);
          invalidateEventsList();
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
        invalidateEventsList();
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
    if (hasExistingItemsOrCategories) {
      setActionError(
        'Cannot apply template to an event that already has items or categories. Templates can only be applied to empty trips to avoid conflicts or duplicates.'
      );
      setIsMenuOpen(false);
      return;
    }

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

    if (hasExistingItemsOrCategories) {
      setActionError(
        'Cannot apply template: trip already has items or categories. Clear the trip first to apply a template without conflicts.'
      );
      setIsApplyTemplateOpen(false);
      return;
    }

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
        invalidateEventsList();
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
    <div className="space-y-5 pb-44 sm:space-y-6 sm:pb-8">
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

      {/* Floating Action Error Alert (Always visible & screen-reader announced) */}
      {actionError && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-6 right-4 sm:right-6 z-50 flex items-center justify-between gap-3 p-3.5 rounded-xl border border-terracotta-200 bg-white shadow-xl text-ink max-w-md w-[calc(100%-2rem)] sm:w-full transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-terracotta-600 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-terracotta-900 leading-snug">
              {actionError}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error notification"
            className="touch-target p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-canvas-subtle transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLocked && (
        <LockedEventBanner
          completedCount={completedItems}
          totalCount={totalItems}
          memberCount={members.length}
          departureDate={event.end_date ? formatDisplayDate(event.end_date) : undefined}
        />
      )}

      {/* Trip Hero Header Card */}
      <div className="overflow-hidden rounded-[26px] border border-canvas-border bg-[#fffefa] shadow-[0_12px_36px_rgba(23,43,36,.05)]">
        <div className="relative isolate flex flex-col gap-5 overflow-hidden bg-[#173b2e] p-5 text-white sm:p-7 md:flex-row md:items-start md:justify-between cohort-grid">
          <div className="relative z-10 min-w-0 flex-1 space-y-3">
            <h1 className="max-w-3xl break-words text-[2rem] font-semibold leading-[1.02] tracking-[-.06em] text-white sm:text-4xl">
              {event.title}
            </h1>
            {event.description && (
              <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-[15px]">
                {event.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-2 text-xs text-white/75">
              {event.location && (
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="h-4 w-4 shrink-0 text-[#d6ef9c]" />
                  <span>{event.location}</span>
                </div>
              )}

              {(event.start_date || event.end_date) && (
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-4 w-4 shrink-0 text-[#d6ef9c]" />
                  <span>{formatTripDateRange(event.start_date, event.end_date)}</span>
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
          <div className="relative z-10 flex shrink-0 items-center gap-2 pt-1 md:pt-0">
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

            {!isLocked && (
              <>
              {/* Trigger stays in the header; the menu itself renders at document level. */}
              <div className="relative" ref={menuRef}>
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  aria-label="Trip actions menu"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  aria-controls="trip-actions-menu"
                  className="touch-target rounded-xl border border-white/20 bg-white/[.07] p-2 text-white transition-colors hover:bg-white/[.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6ef9c] cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
  
              </>
            )}
            {isMenuOpen &&
              !isLocked &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  id="trip-actions-menu"
                  ref={menuContentRef}
                  role="menu"
                  aria-label="Trip options"
                  aria-orientation="vertical"
                  onKeyDown={(event) => {
                    const items = Array.from(
                      event.currentTarget.querySelectorAll<HTMLButtonElement>(
                        '[role="menuitem"]:not(:disabled)'
                      )
                    );
                    if (items.length === 0) return;
                    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
                    let nextIndex = currentIndex;

                    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
                    else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
                    else if (event.key === 'Home') nextIndex = 0;
                    else if (event.key === 'End') nextIndex = items.length - 1;
                    else if (event.key === 'Escape') {
                      event.preventDefault();
                      setIsMenuOpen(false);
                      menuButtonRef.current?.focus();
                      return;
                    } else if (event.key === 'Tab') {
                      setIsMenuOpen(false);
                      menuButtonRef.current?.focus();
                      return;
                    } else {
                      return;
                    }

                    event.preventDefault();
                    items[nextIndex]?.focus();
                  }}
                  style={{
                    position: 'fixed',
                    top: menuPosition.top,
                    left: menuPosition.left,
                    width: menuPosition.width,
                    maxHeight: menuPosition.maxHeight,
                    visibility: menuPosition.ready ? 'visible' : 'hidden',
                  }}
                  className="z-[100] flex flex-col gap-1 overflow-y-auto rounded-2xl border border-canvas-border bg-[#fffefa] p-1.5 text-sm text-ink shadow-[0_16px_48px_rgba(23,43,36,.2)] ring-1 ring-black/5"
                >
                  {!isLocked && (
                    <>
                      <button
                        role="menuitem"
                        tabIndex={-1}
                        type="button"
                        onClick={handleOpenSaveTemplate}
                        disabled={totalItems === 0}
                        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <BookmarkPlus className="h-4 w-4 shrink-0 text-pine-700" aria-hidden="true" />
                        <span>Save as Template</span>
                      </button>
                      <button
                        role="menuitem"
                        tabIndex={-1}
                        type="button"
                        onClick={handleOpenApplyTemplate}
                        disabled={hasExistingItemsOrCategories}
                        title={
                          hasExistingItemsOrCategories
                            ? 'Templates can only be applied to empty trips with no items or categories'
                            : 'Apply saved template'
                        }
                        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left transition-colors hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <span className="flex items-center gap-3">
                          <Sparkles className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                          <span>Apply Template</span>
                        </span>
                        {hasExistingItemsOrCategories && (
                          <span className="shrink-0 rounded-md border border-canvas-border bg-canvas-subtle px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                            Empty only
                          </span>
                        )}
                      </button>
                    </>
                  )}

                  {isOwner && !isLocked && (
                    <>
                      <div role="separator" className="mx-2 my-1 h-px bg-canvas-border" />
                      <button
                        role="menuitem"
                        tabIndex={-1}
                        type="button"
                        onClick={handleArchiveToggle}
                        disabled={isArchiving}
                        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Layers className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                        <span>{isArchived ? 'Restore Trip' : 'Archive Trip'}</span>
                      </button>
                      <button
                        role="menuitem"
                        tabIndex={-1}
                        type="button"
                        onClick={() => {
                          setIsCompleteModalOpen(true);
                          setIsMenuOpen(false);
                        }}
                        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-medium text-pine-800 transition-colors hover:bg-pine-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
                      >
                        <PackageCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Wrap Up Trip</span>
                      </button>
                    </>
                  )}
                </div>,
                document.body
              )}
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="border-t border-canvas-border p-5 sm:p-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-pine-600" />
              <span>Packing progress</span>
            </span>
            <span className="font-mono">
              {completedItems}/{totalItems} packed · {overallProgressPct}%
            </span>
          </div>
          <Progress
            value={overallProgressPct}
            variant={isLocked ? 'locked' : 'pine'}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 pb-4 pt-1 sm:px-7 sm:pb-6">
          <Tabs
            tabs={[
              { id: 'checklist', label: 'Packing List', mobileLabel: 'List', count: totalItems },
              { id: 'members', label: 'Cohort Members', mobileLabel: 'People', count: members.length },
              { id: 'activity', label: 'Activity Feed', mobileLabel: 'Activity', count: activities.length },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as 'checklist' | 'members' | 'activity')}
            ariaLabel="Trip Details Navigation"
            variant="segmented"
          />
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'checklist' && (
        <div id="panel-checklist" role="tabpanel" aria-labelledby="tab-checklist" tabIndex={0} className="space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-pine-600 sm:space-y-5">
          {/* Streamlined Mobile & Desktop Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Segmented Filter Control */}
            <div role="group" aria-label="Filter checklist items" className="flex w-full items-center gap-2 overflow-x-auto py-0.5 scrollbar-none sm:w-auto">
              {([
                { id: 'all', label: 'All', count: totalItems },
                { id: 'mine', label: 'Mine', count: mineCount },
                { id: 'unassigned', label: 'Unassigned', count: unassignedCount },
              ] as const).map((filter) => {
                const selected = filterMode === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilterMode(filter.id)}
                    className={cn(
                      'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2 sm:gap-2 sm:px-3',
                      selected
                        ? 'border-pine-800 bg-pine-800 text-white shadow-sm'
                        : 'border-canvas-border bg-[#fffefa] text-ink-muted hover:border-pine-500 hover:text-ink'
                    )}
                  >
                    <span>{filter.label}</span>
                    <span className={cn(
                      'inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                      selected ? 'bg-white/15 text-white' : 'bg-canvas-subtle text-ink-muted'
                    )}>
                      {filter.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Compact Action Buttons */}
            {!isLocked && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSectionTitle('');
                    setIsAddSectionOpen(true);
                  }}
                  className="h-11 w-full justify-center text-sm font-medium sm:w-auto sm:justify-start"
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
                    setItemDeadline('');
                    setIsAddItemOpen(true);
                  }}
                  className="hidden h-11 justify-center text-sm font-medium sm:inline-flex"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add item
                </Button>


              </div>
            )}
          </div>

          {/* Celebratory Milestone: 100% Cohort Readiness */}
          {overallProgressPct === 100 && totalItems > 0 && !isLocked && (
            <div className="rounded-xl border border-pine-300 bg-linear-to-r from-pine-50 via-white to-pine-50/80 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pine-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-ink text-sm sm:text-base">
                      Cohort Ready for Departure! 🏕️
                    </h3>
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-pine-600 text-white font-mono">
                      100% Packed
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    All {totalItems} gear items are packed and accounted for. Ready to head to the trailhead?
                  </p>
                </div>
              </div>
              {isOwner && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsCompleteModalOpen(true)}
                  className="shrink-0 gap-1.5 shadow-2xs cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Seal & Wrap Up</span>
                </Button>
              )}
            </div>
          )}

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
              secondaryActionLabel={!isLocked ? 'Add Category' : undefined}
              onSecondaryAction={
                !isLocked
                  ? () => {
                      setSectionTitle('');
                      setIsAddSectionOpen(true);
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-6">
              {/* Direct Unsectioned Items Card */}
              {unsectionedItems.length > 0 && (
                <div className="overflow-hidden rounded-[20px] border border-canvas-border/80 bg-[#fffefa] p-4 sm:p-5">
                  {/* Card Header */}
                  <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-canvas-border pb-3 sm:items-center">
                    <div className="flex min-w-0 items-start gap-2">
                      <PackageCheck aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-pine-700" />
                      <h2 className="min-w-0 flex-1 break-words text-base font-semibold leading-snug tracking-[-.035em] text-ink sm:text-lg">
                        {sections.length > 0 ? 'General items' : 'Checklist items'}
                      </h2>
                      <span className="shrink-0 rounded-full bg-canvas-subtle px-2 py-1 text-xs font-medium tabular-nums text-ink-muted">
                        {unsectionedItems.filter((i) => i.is_completed).length} of {unsectionedItems.length}
                      </span>
                    </div>


                  </div>

                  {/* Items List */}
                  {filteredUnsectionedItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-ink-muted bg-canvas-subtle/30 rounded-xl border border-dashed border-canvas-border">
                      {filterMode === 'all'
                        ? 'No direct items yet.'
                        : `No direct items matching "${filterMode}".`}
                    </div>
                  ) : (
                    <div className="space-y-0">
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
                          onDelete={() => setItemToDelete({ id: item.id, title: item.title, sectionId: null })}
                        />
                      ))}
                    </div>
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
                    className="overflow-hidden rounded-[20px] border border-canvas-border/80 bg-[#fffefa] p-4 sm:p-5"
                  >
                    {/* Section Header */}
                    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-canvas-border pb-3 sm:items-center">
                      <div className="flex min-w-0 items-start gap-2">
                        <Layers aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />
                        <h2 className="min-w-0 break-words text-base font-semibold leading-snug tracking-[-.035em] text-ink sm:text-lg">
                          {section.title}
                        </h2>
                        <span className="shrink-0 rounded-full bg-canvas-subtle px-2 py-1 text-xs font-medium tabular-nums text-ink-muted">
                          {secCompleted} of {secTotal}
                        </span>
                      </div>


                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteSection(section)}
                          aria-label={`Remove ${section.title} category`}
                          title="Remove category"
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-terracotta-50 hover:text-terracotta-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
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
                      <div className="space-y-0">
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
                            onDelete={() => setItemToDelete({ id: item.id, title: item.title, sectionId: section.id })}
                          />
                        ))}
                      </div>
                    )}

                    {/* Progressive Disclosure Quick Add Input */}
                    {!isLocked && (
                      <>
                        {activeQuickAddSection === section.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleQuickAdd(section.id);
                            }}
                            className="mt-3 pt-3 border-t border-canvas-border/70 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                          >
                            <input
                              type="text"
                              autoFocus
                              placeholder={`Add gear item to ${section.title}...`}
                              value={quickAddTitles[section.id] || ''}
                              onChange={(e) =>
                                setQuickAddTitles((prev) => ({
                                  ...prev,
                                  [section.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setActiveQuickAddSection(null);
                                }
                              }}
                              className="flex-1 bg-white px-3 py-2 text-sm rounded-lg border border-canvas-border focus:border-pine-600 focus:outline-none transition-colors text-ink placeholder:text-ink-muted/70"
                            />
                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedSectionId(section.id);
                                  setItemTitle(quickAddTitles[section.id] || '');
                                  setItemQuantity('');
                                  setItemNotes('');
                                  setItemAssigneeId('');
                                  setItemDeadline('');
                                  setIsAddItemOpen(true);
                                }}
                                className="text-xs text-ink-muted hover:text-ink h-9 px-2"
                                title="Open full item specifications"
                              >
                                <span>Details...</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveQuickAddSection(null)}
                                className="text-xs h-9 px-2.5"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                variant="primary"
                                disabled={!quickAddTitles[section.id]?.trim()}
                                className="text-xs h-9 px-3 gap-1 cursor-pointer"
                                aria-label="Save item"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveQuickAddSection(section.id)}
                            className="mt-3 inline-flex min-h-11 w-full items-center justify-start rounded-lg border-t border-canvas-border/70 px-2 py-2 text-sm font-medium text-pine-800 transition-colors hover:bg-pine-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 cursor-pointer"
                          >
                            <span>Add an item</span>
                          </button>
                        )}
                      </>
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
        <div id="panel-members" role="tabpanel" aria-labelledby="tab-members" tabIndex={0} className="rounded-[24px] border border-canvas-border bg-[#fffefa] p-5 shadow-[0_8px_28px_rgba(23,43,36,.04)] outline-none focus-visible:ring-2 focus-visible:ring-pine-600 sm:p-7">
          <div className="mb-4 flex items-center justify-between gap-3">
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
        <div id="panel-activity" role="tabpanel" aria-labelledby="tab-activity" tabIndex={0} className="rounded-[24px] border border-canvas-border bg-[#fffefa] p-5 shadow-[0_8px_28px_rgba(23,43,36,.04)] outline-none focus-visible:ring-2 focus-visible:ring-pine-600 sm:p-7">
          <h2 className="mb-1 text-xl font-semibold tracking-[-.04em] text-ink">Trip Timeline</h2>
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

      {!isLocked && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)_+_6.25rem)] right-4 z-30 sm:hidden">
          <button
            type="button"
            aria-label="Add item"
            title="Add item"
            onClick={() => {
              setSelectedSectionId(null);
              setItemTitle('');
              setItemQuantity('');
              setItemNotes('');
              setItemAssigneeId('');
              setItemDeadline('');
              setIsAddItemOpen(true);
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-pine-800 text-white shadow-[0_8px_24px_rgba(23,59,46,.28)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-pine-700 hover:shadow-[0_12px_30px_rgba(23,59,46,.32)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2"
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
          </button>
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

      {/* Remove Category Modal */}
      <Dialog
        isOpen={Boolean(sectionToDelete)}
        onClose={handleCloseDeleteSection}
        title="Remove Category"
        description={
          sectionToDelete
            ? `Are you sure you want to remove "${sectionToDelete.title}"?`
            : undefined
        }
      >
        {sectionToDelete && (
          <div className="space-y-4 py-1">
            {sectionToDelete.items.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold text-amber-950 mb-1">
                    This category contains {sectionToDelete.items.length}{' '}
                    {sectionToDelete.items.length === 1 ? 'item' : 'items'}.
                  </p>
                  <p>
                    What would you like to do with the gear in this category?
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      deleteSectionKeepItems
                        ? 'border-pine-600 bg-pine-50/50'
                        : 'border-canvas-border hover:bg-canvas-subtle/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="deleteSectionMode"
                      checked={deleteSectionKeepItems}
                      onChange={() => setDeleteSectionKeepItems(true)}
                      className="mt-0.5 text-pine-600 focus:ring-pine-600"
                    />
                    <div>
                      <span className="text-xs font-semibold text-ink block">
                        Keep items and move to General Items (Recommended)
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        Gear items will not be deleted; they will be moved to the unsectioned list.
                      </span>
                    </div>
                  </label>

                  <label
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      !deleteSectionKeepItems
                        ? 'border-terracotta-500 bg-terracotta-50/40'
                        : 'border-canvas-border hover:bg-canvas-subtle/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="deleteSectionMode"
                      checked={!deleteSectionKeepItems}
                      onChange={() => setDeleteSectionKeepItems(false)}
                      className="mt-0.5 text-terracotta-600 focus:ring-terracotta-600"
                    />
                    <div>
                      <span className="text-xs font-semibold text-terracotta-700 block">
                        Delete category and all its items
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        Permanently remove all {sectionToDelete.items.length} items inside this category.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted">
                This category has no items. Removing it will not delete any gear.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-canvas-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseDeleteSection}
                disabled={isDeletingSection}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirmDeleteSection}
                isLoading={isDeletingSection}
                className={cn(
                  !deleteSectionKeepItems && sectionToDelete.items.length > 0
                    ? 'bg-terracotta-600 hover:bg-terracotta-700 text-white'
                    : undefined
                )}
              >
                {deleteSectionKeepItems && sectionToDelete.items.length > 0
                  ? 'Move Items & Remove Category'
                  : 'Remove Category'}
              </Button>
            </div>
          </div>
        )}
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
                min={todayDateString}
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
                  min={
                    editingItem.deadline && editingItem.deadline.split('T')[0] < todayDateString
                      ? editingItem.deadline.split('T')[0]
                      : todayDateString
                  }
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
          {hasExistingItemsOrCategories ? (
            <div className="space-y-4">
              <InlineAlert
                type="error"
                message="This trip already has items or categories. Applying a template is forbidden to avoid conflicts or duplicate items. Templates can only be applied to empty trips."
              />
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApplyTemplateOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : userTemplates.length === 0 ? (
            <div className="py-4 text-center text-sm text-ink-muted">
              You haven&apos;t saved any templates yet. To create a template, open an active or past trip with items and select &ldquo;Save as Template&rdquo; from the trip menu.
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
                  disabled={hasExistingItemsOrCategories}
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

      {/* Delete Item Confirmation Modal */}
      <Dialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        title="Remove Gear Item"
        description={
          itemToDelete
            ? `Are you sure you want to remove "${itemToDelete.title}"?`
            : undefined
        }
      >
        {itemToDelete && (
          <div className="space-y-4 py-1">
            <p className="text-xs text-ink-muted leading-relaxed">
              This will remove this gear item from the checklist for all expedition members. You can re-add it at any time.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-canvas-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemToDelete(null)}
              >
                Keep Item
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-terracotta-600 hover:bg-terracotta-700 text-white"
                onClick={async () => {
                  const target = itemToDelete;
                  setItemToDelete(null);
                  await handleDeleteItem(target.id, target.sectionId);
                }}
              >
                Remove Item
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
