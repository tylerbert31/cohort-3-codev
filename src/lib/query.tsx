'use client';

import { useUser } from '@clerk/nextjs';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  listUserEventsAction,
  getEventDetailsAction,
  createEventAction,
  archiveEventAction,
  restoreEventAction,
  completeEventAction,
  type CreateEventInput,
} from '@/server/actions/events';
import {
  listUserTemplatesAction,
  createSectionAction,
  createItemAction,
  toggleItemCompletionAction,
  deleteItemAction,
  applyTemplateToEventAction,
  saveTemplateFromEventAction,
  createTemplateAction,
  deleteTemplateAction,
} from '@/server/actions/checklist';
import {
  validateInviteCodeAction,
  joinEventAction,
} from '@/server/actions/invitations';
import { syncUserProfile } from '@/server/actions/profile';
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

// ============================================================================
// QUERY KEYS FACTORY
// ============================================================================

export const queryKeys = {
  events: {
    all: ['events'] as const,
    list: () => [...queryKeys.events.all, 'list'] as const,
    detail: (eventId: string) => [...queryKeys.events.all, 'detail', eventId] as const,
  },
  templates: {
    all: ['templates'] as const,
    list: () => [...queryKeys.templates.all, 'list'] as const,
  },
  invites: {
    all: ['invites'] as const,
    validate: (code: string) => [...queryKeys.invites.all, 'validate', code.trim().toUpperCase()] as const,
  },
  profile: {
    sync: ['profile', 'sync'] as const,
  },
};

// ============================================================================
// QUERY HOOKS (WITH LOADING, ERROR HANDLING, AND POLLING)
// ============================================================================

export interface UserEventsData {
  active: (Event & { itemCount: number; completedItemCount: number; assignedItemCount: number })[];
  archived: (Event & { itemCount: number; completedItemCount: number; assignedItemCount: number })[];
  completed: (Event & { itemCount: number; completedItemCount: number; assignedItemCount: number })[];
}

/**
 * Fetches the signed-in user's trip list with a user-scoped cache key, immediate
 * refresh when the homepage is revisited, focus/reconnect refetching, and polling.
 *
 * The server action derives the actual user from the authenticated server session;
 * the Clerk user ID here scopes client cache entries so accounts never share list data.
 */
export function useEventsList(options?: {
  pollingInterval?: number;
  enabled?: boolean;
}): UseQueryResult<UserEventsData, Error> {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  return useQuery<UserEventsData, Error>({
    queryKey: [...queryKeys.events.list(), userId ?? 'signed-out'],
    queryFn: async () => {
      const res = await listUserEventsAction();
      if (!res.success) {
        throw new Error(res.error || 'Failed to fetch trips.');
      }
      return res.data;
    },
    enabled: isLoaded && Boolean(userId) && (options?.enabled ?? true),
    // Never trust the previous visit's list for the initial view after navigation.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: options?.pollingInterval ?? 10_000,
    refetchIntervalInBackground: false,
  });
}

/** Backwards-compatible alias for existing consumers. */
export function useUserEventsQuery(options?: {
  pollingInterval?: number;
  enabled?: boolean;
}): UseQueryResult<UserEventsData, Error> {
  return useEventsList(options);
}

export interface EventDetailsData {
  event: Event;
  members: (EventMember & { profile?: Profile })[];
  activities: ActivityEvent[];
  sections: (ChecklistSection & { items: ChecklistItem[] })[];
  unsectionedItems?: (ChecklistItem & { assignee?: Profile | null })[];
  userRole: 'owner' | 'participant';
}

/**
 * Fetches real-time event details, checklist sections, items, and activities with configurable polling.
 */
export function useEventDetailsQuery(
  eventId: string,
  options?: {
    pollingInterval?: number;
    enabled?: boolean;
    initialData?: EventDetailsData;
  }
): UseQueryResult<EventDetailsData, Error> {
  return useQuery<EventDetailsData, Error>({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: async () => {
      const res = await getEventDetailsAction(eventId);
      if (!res.success) {
        throw new Error(res.error || 'Failed to fetch outing details.');
      }
      return res.data;
    },
    enabled: Boolean(eventId) && (options?.enabled ?? true),
    initialData: options?.initialData,
    refetchInterval: options?.pollingInterval ?? 5_000,
    refetchIntervalInBackground: false,
  });
}

export type UserTemplatesData = (ChecklistTemplate & {
  sections: (TemplateSection & { items: TemplateItem[] })[];
})[];

/**
 * Fetches the authenticated user's personal templates with polling and error handling.
 */
export function useUserTemplatesQuery(options?: {
  pollingInterval?: number;
  enabled?: boolean;
}): UseQueryResult<UserTemplatesData, Error> {
  return useQuery<UserTemplatesData, Error>({
    queryKey: queryKeys.templates.list(),
    queryFn: async () => {
      const res = await listUserTemplatesAction();
      if (!res.success) {
        throw new Error(res.error || 'Failed to fetch templates.');
      }
      return res.data;
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.pollingInterval ?? 30_000,
  });
}

export interface InviteValidationData {
  valid: boolean;
}

/**
 * Validates an invite code with loading and error states without disclosing private event details.
 */
export function useValidateInviteQuery(
  inviteCode: string,
  options?: {
    enabled?: boolean;
  }
): UseQueryResult<InviteValidationData, Error> {
  return useQuery<InviteValidationData, Error>({
    queryKey: queryKeys.invites.validate(inviteCode.trim().toUpperCase()),
    queryFn: async () => {
      const res = await validateInviteCodeAction(inviteCode.trim().toUpperCase());
      if (!res.success) {
        throw new Error(res.error || 'Invalid or expired invite code.');
      }
      return res.data;
    },
    enabled: Boolean(inviteCode.trim()) && (options?.enabled ?? true),
    retry: false,
  });
}

/**
 * Synchronizes Clerk profile to Supabase.
 */
export function useProfileSyncQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<boolean, Error> {
  return useQuery<boolean, Error>({
    queryKey: queryKeys.profile.sync,
    queryFn: async () => {
      const res = await syncUserProfile();
      if (!res.success) {
        throw new Error(res.error || 'Profile synchronization failed.');
      }
      return true;
    },
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
  });
}

// ============================================================================
// MUTATION HOOKS (WITH QUERY INVALIDATION)
// ============================================================================

export function useCreateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const res = await createEventAction(input);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useArchiveEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await archiveEventAction(eventId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useRestoreEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await restoreEventAction(eventId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useCompleteEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await completeEventAction(eventId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useToggleItemCompletionMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      const res = await toggleItemCompletionAction({ eventId, itemId, isCompleted });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useCreateSectionMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      const res = await createSectionAction({ eventId, title });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
    },
  });
}

export function useCreateItemMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      section_id?: string | null;
      title: string;
      notes?: string | null;
      quantity?: string | null;
      assignee_id?: string | null;
    }) => {
      const res = await createItemAction({ eventId, ...input });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useDeleteItemMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await deleteItemAction({ eventId, itemId });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useApplyTemplateMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const res = await applyTemplateToEventAction({ eventId, templateId });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useSaveTemplateFromEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { eventId: string; templateName: string; description?: string }) => {
      const res = await saveTemplateFromEventAction(input);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.list() });
    },
  });
}

export function useCreateTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string | null;
      sections?: { title: string; items?: { title: string; quantity?: string; notes?: string }[] }[];
    }) => {
      const res = await createTemplateAction(input);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.list() });
    },
  });
}

export function useDeleteTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const res = await deleteTemplateAction(templateId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.list() });
    },
  });
}

export function useJoinEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await joinEventAction(inviteCode);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
      if (data?.eventId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(data.eventId) });
      }
    },
  });
}
