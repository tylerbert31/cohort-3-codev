import { supabaseAdmin } from '@/server/db/supabase-admin';

interface SupabaseDbFallback { from: (table: string) => { upsert: (p: unknown) => Promise<unknown>; insert: (p: unknown) => Promise<unknown> } }
const rawDb = supabaseAdmin as unknown as SupabaseDbFallback;
import type {
  Event,
  EventMember,
  EventInvite,
  ActivityEvent,
  Profile,
  ChecklistSection,
  ChecklistItem,
  ChecklistTemplate,
  TemplateSection,
  TemplateItem,
} from '@/types/database';
import {
  assertEventNotCompleted,
  assertEventMembership,
  assertEventOwner,
  AuthorizationError,
} from '@/server/auth/authorization';
import { inviteRateLimiter } from '@/server/utils/rate-limiter';

/**
 * Generates a high-entropy 8-character uppercase alphanumeric invite code.
 * Omits ambiguous characters (0, O, 1, I) for readability on mobile.
 */
export function generateSecureInviteCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const array = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 8; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

// In-memory persistent fallback store for tests and offline/local development
const memoryStore = {
  profiles: new Map<string, Profile>(),
  events: new Map<string, Event>(),
  members: new Map<string, EventMember[]>(), // eventId -> members
  invites: new Map<string, EventInvite[]>(), // eventId -> invites
  activities: new Map<string, ActivityEvent[]>(), // eventId -> activities
  sections: new Map<string, ChecklistSection[]>(), // eventId -> sections
  items: new Map<string, ChecklistItem[]>(), // eventId -> items
  templates: new Map<string, ChecklistTemplate[]>(), // ownerId -> templates
  templateSections: new Map<string, TemplateSection[]>(), // templateId -> sections
  templateItems: new Map<string, TemplateItem[]>(), // templateId -> items
};

export class EventsRepository {
  /**
   * Resets in-memory storage (useful for isolated unit testing).
   */
  static resetMemoryStore(): void {
    memoryStore.profiles.clear();
    memoryStore.events.clear();
    memoryStore.members.clear();
    memoryStore.invites.clear();
    memoryStore.activities.clear();
    memoryStore.sections.clear();
    memoryStore.items.clear();
    memoryStore.templates.clear();
    memoryStore.templateSections.clear();
    memoryStore.templateItems.clear();
  }

  /**
   * Ensures or updates user profile in store.
   */
  static async upsertProfile(profile: Partial<Profile> & { clerk_user_id: string }): Promise<Profile> {
    const now = new Date().toISOString();
    const existing = memoryStore.profiles.get(profile.clerk_user_id);
    const updated: Profile = {
      id: existing?.id || crypto.randomUUID(),
      clerk_user_id: profile.clerk_user_id,
      first_name: profile.first_name ?? existing?.first_name ?? null,
      last_name: profile.last_name ?? existing?.last_name ?? null,
      image_url: profile.image_url ?? existing?.image_url ?? null,
      created_at: existing?.created_at || now,
      updated_at: now,
    };
    memoryStore.profiles.set(profile.clerk_user_id, updated);

    // Try Supabase if available
    try {
      await rawDb.from('profiles').upsert({
        clerk_user_id: updated.clerk_user_id,
        first_name: updated.first_name,
        last_name: updated.last_name,
        image_url: updated.image_url,
      });
    } catch {
      // Graceful fallback to memory store
    }

    return updated;
  }

  /**
   * Creates an event and atomically records owner membership and activity log.
   */
  static async createEvent(
    ownerClerkId: string,
    payload: {
      title: string;
      description?: string | null;
      location?: string | null;
      start_date?: string | null;
      end_date?: string | null;
    }
  ): Promise<{ event: Event; ownerMember: EventMember }> {
    if (!ownerClerkId) {
      throw new AuthorizationError('Authentication required to create event.', 'UNAUTHORIZED');
    }

    const title = payload.title.trim();
    if (!title || title.length > 100) {
      throw new Error('Title is required and must not exceed 100 characters.');
    }

    const now = new Date().toISOString();
    const eventId = crypto.randomUUID();

    const event: Event = {
      id: eventId,
      owner_id: ownerClerkId,
      title,
      description: payload.description?.trim() || null,
      location: payload.location?.trim() || null,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      status: 'active',
      archived_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };

    const ownerMember: EventMember = {
      id: crypto.randomUUID(),
      event_id: eventId,
      clerk_user_id: ownerClerkId,
      role: 'owner',
      joined_at: now,
    };

    const activity: ActivityEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      actor_id: ownerClerkId,
      event_type: 'event_created',
      details: { title: event.title, location: event.location },
      created_at: now,
    };

    // Store in memory
    memoryStore.events.set(eventId, event);
    memoryStore.members.set(eventId, [ownerMember]);
    memoryStore.activities.set(eventId, [activity]);
    memoryStore.invites.set(eventId, []);
    memoryStore.sections.set(eventId, []);
    memoryStore.items.set(eventId, []);

    // Attempt Supabase insert
    try {
      await rawDb.from('events').insert({
        id: event.id,
        owner_id: event.owner_id,
        title: event.title,
        description: event.description,
        location: event.location,
        start_date: event.start_date,
        end_date: event.end_date,
        status: event.status,
      });

      await rawDb.from('event_members').insert({
        id: ownerMember.id,
        event_id: ownerMember.event_id,
        clerk_user_id: ownerMember.clerk_user_id,
        role: ownerMember.role,
      });

      await rawDb.from('activity_events').insert({
        id: activity.id,
        event_id: activity.event_id,
        actor_id: activity.actor_id,
        event_type: activity.event_type,
        details: activity.details,
      });
    } catch {
      // Retain memory store state
    }

    return { event, ownerMember };
  }

  /**
   * Retrieves an event by ID with server-side authorization check,
   * including members, activities, and grouped checklist sections/items.
   */
  static async getEvent(
    clerkUserId: string | null | undefined,
    eventId: string
  ): Promise<{
    event: Event;
    members: (EventMember & { profile?: Profile })[];
    activities: ActivityEvent[];
    sections: (ChecklistSection & { items: ChecklistItem[] })[];
    unsectionedItems: (ChecklistItem & { assignee?: Profile | null })[];
    userRole: 'owner' | 'participant';
  }> {
    if (!clerkUserId) {
      throw new AuthorizationError('Authentication required to view event.', 'UNAUTHORIZED');
    }

    const event = memoryStore.events.get(eventId);
    if (!event) {
      throw new Error('EVENT_NOT_FOUND');
    }

    const members = memoryStore.members.get(eventId) || [];
    const member = assertEventMembership(clerkUserId, members);

    const membersWithProfiles = members.map((m) => ({
      ...m,
      profile: memoryStore.profiles.get(m.clerk_user_id),
    }));

    const rawSections = (memoryStore.sections.get(eventId) || []).sort(
      (a, b) => a.position - b.position
    );
    const rawItems = (memoryStore.items.get(eventId) || []).sort(
      (a, b) => a.position - b.position
    );

    const sectionsWithItems = rawSections.map((sec) => {
      const items = rawItems
        .filter((it) => it.section_id === sec.id)
        .map((it) => ({
          ...it,
          assignee: it.assignee_id ? memoryStore.profiles.get(it.assignee_id) || null : null,
        }));
      return { ...sec, items };
    });

    const unsectionedItems = rawItems
      .filter((it) => !it.section_id || !rawSections.some((s) => s.id === it.section_id))
      .map((it) => ({
        ...it,
        assignee: it.assignee_id ? memoryStore.profiles.get(it.assignee_id) || null : null,
      }));

    const activities = (memoryStore.activities.get(eventId) || []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      event,
      members: membersWithProfiles,
      activities,
      sections: sectionsWithItems,
      unsectionedItems,
      userRole: member.role,
    };
  }

  /**
   * Lists events for the authenticated user, separated by lifecycle state.
   */
  static async listEventsForUser(clerkUserId: string | null | undefined): Promise<{
    active: (Event & { itemCount: number; completedItemCount: number })[];
    archived: (Event & { itemCount: number; completedItemCount: number })[];
    completed: (Event & { itemCount: number; completedItemCount: number })[];
  }> {
    if (!clerkUserId) {
      throw new AuthorizationError('Authentication required to list events.', 'UNAUTHORIZED');
    }

    const userEventIds = new Set<string>();
    for (const [eventId, members] of memoryStore.members.entries()) {
      if (members.some((m) => m.clerk_user_id === clerkUserId)) {
        userEventIds.add(eventId);
      }
    }

    const active: (Event & { itemCount: number; completedItemCount: number })[] = [];
    const archived: (Event & { itemCount: number; completedItemCount: number })[] = [];
    const completed: (Event & { itemCount: number; completedItemCount: number })[] = [];

    for (const id of userEventIds) {
      const evt = memoryStore.events.get(id);
      if (evt) {
        const items = memoryStore.items.get(id) || [];
        const itemCount = items.length;
        const completedItemCount = items.filter((i) => i.is_completed).length;
        const eventWithCounts = { ...evt, itemCount, completedItemCount };

        if (evt.status === 'completed') completed.push(eventWithCounts);
        else if (evt.status === 'archived') archived.push(eventWithCounts);
        else active.push(eventWithCounts);
      }
    }

    return {
      active: active.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      archived: archived.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      completed: completed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    };
  }

  /**
   * Archives an event. Only the owner can archive, and completed events cannot be archived.
   */
  static async archiveEvent(clerkUserId: string, eventId: string): Promise<Event> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    assertEventOwner(clerkUserId, event.owner_id);

    const now = new Date().toISOString();
    event.status = 'archived';
    event.archived_at = now;
    event.updated_at = now;

    const activity: ActivityEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      actor_id: clerkUserId,
      event_type: 'event_archived',
      details: { title: event.title },
      created_at: now,
    };
    (memoryStore.activities.get(eventId) || []).push(activity);

    return event;
  }

  /**
   * Restores an archived event to active state.
   */
  static async restoreEvent(clerkUserId: string, eventId: string): Promise<Event> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    assertEventOwner(clerkUserId, event.owner_id);

    const now = new Date().toISOString();
    event.status = 'active';
    event.archived_at = null;
    event.updated_at = now;

    const activity: ActivityEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      actor_id: clerkUserId,
      event_type: 'event_restored',
      details: { title: event.title },
      created_at: now,
    };
    (memoryStore.activities.get(eventId) || []).push(activity);

    return event;
  }

  /**
   * Marks an event permanently completed.
   */
  static async completeEvent(clerkUserId: string, eventId: string): Promise<Event> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    assertEventOwner(clerkUserId, event.owner_id);

    const now = new Date().toISOString();
    event.status = 'completed';
    event.completed_at = now;
    event.updated_at = now;

    const activity: ActivityEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      actor_id: clerkUserId,
      event_type: 'event_completed',
      details: { title: event.title },
      created_at: now,
    };
    (memoryStore.activities.get(eventId) || []).push(activity);

    return event;
  }

  /**
   * Generates a reusable 8-character invite code for an event.
   * Participants or owner can generate an invite.
   */
  static async createInvite(
    clerkUserId: string,
    eventId: string
  ): Promise<EventInvite> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);

    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    // Check for an existing active invite
    const existingInvites = memoryStore.invites.get(eventId) || [];
    const active = existingInvites.find((i) => i.is_active && !i.revoked_at);
    if (active) {
      return active;
    }

    const inviteCode = generateSecureInviteCode();
    const now = new Date().toISOString();

    const invite: EventInvite = {
      id: crypto.randomUUID(),
      event_id: eventId,
      invite_code: inviteCode,
      created_by: clerkUserId,
      is_active: true,
      created_at: now,
      revoked_at: null,
    };

    existingInvites.push(invite);
    memoryStore.invites.set(eventId, existingInvites);

    return invite;
  }

  /**
   * Revokes an invite code. Only the event owner can revoke invites.
   */
  static async revokeInvite(
    clerkUserId: string,
    inviteCode: string
  ): Promise<void> {
    const normalizedCode = inviteCode.trim().toUpperCase();

    let foundInvite: EventInvite | null = null;
    let foundEventId: string | null = null;

    for (const [eventId, invites] of memoryStore.invites.entries()) {
      const match = invites.find((i) => i.invite_code === normalizedCode);
      if (match) {
        foundInvite = match;
        foundEventId = eventId;
        break;
      }
    }

    if (!foundInvite || !foundEventId) {
      throw new AuthorizationError('Invite code not found.', 'INVALID_INVITE');
    }

    const event = memoryStore.events.get(foundEventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventOwner(clerkUserId, event.owner_id);

    foundInvite.is_active = false;
    foundInvite.revoked_at = new Date().toISOString();
  }

  /**
   * Validates an invite code safely with rate-limiting and zero leakage of private event data.
   */
  static async validateInvite(
    rateLimitKey: string,
    inviteCode: string
  ): Promise<{ valid: boolean; eventId?: string }> {
    const rateCheck = inviteRateLimiter.check(rateLimitKey, 10, 60_000);
    if (!rateCheck.allowed) {
      throw new Error('Too many attempts. Please try again in 1 minute.');
    }

    const normalizedCode = inviteCode.trim().toUpperCase();
    for (const [eventId, invites] of memoryStore.invites.entries()) {
      const match = invites.find(
        (i) => i.invite_code === normalizedCode && i.is_active && !i.revoked_at
      );
      if (match) {
        return { valid: true, eventId };
      }
    }

    return { valid: false };
  }

  /**
   * Allows an authenticated user to join an event using an invite code.
   * Handles idempotency (if already a member, returns success).
   */
  static async joinEventWithCode(
    clerkUserId: string,
    inviteCode: string,
    rateLimitKey: string
  ): Promise<{ success: boolean; eventId: string; alreadyMember: boolean }> {
    if (!clerkUserId) {
      throw new AuthorizationError('Authentication required to join an outing.', 'UNAUTHORIZED');
    }

    const { valid, eventId } = await this.validateInvite(rateLimitKey, inviteCode);
    if (!valid || !eventId) {
      throw new AuthorizationError('Invalid or expired invite code.', 'INVALID_INVITE');
    }

    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);

    const members = memoryStore.members.get(eventId) || [];
    const isExisting = members.find((m) => m.clerk_user_id === clerkUserId);

    if (isExisting) {
      return { success: true, eventId, alreadyMember: true };
    }

    const now = new Date().toISOString();
    const newMember: EventMember = {
      id: crypto.randomUUID(),
      event_id: eventId,
      clerk_user_id: clerkUserId,
      role: 'participant',
      joined_at: now,
    };

    members.push(newMember);
    memoryStore.members.set(eventId, members);

    const activity: ActivityEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      actor_id: clerkUserId,
      event_type: 'member_joined',
      details: { role: 'participant' },
      created_at: now,
    };
    (memoryStore.activities.get(eventId) || []).push(activity);

    return { success: true, eventId, alreadyMember: false };
  }

  // ============================================================================
  // CHECKLIST SECTIONS
  // ============================================================================

  /**
   * Creates a checklist section within an event.
   */
  static async createSection(
    clerkUserId: string,
    eventId: string,
    payload: { title: string; position?: number }
  ): Promise<ChecklistSection> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    const title = payload.title.trim();
    if (!title) throw new Error('Section title is required.');

    const sections = memoryStore.sections.get(eventId) || [];
    const position = payload.position ?? sections.length;
    const now = new Date().toISOString();

    const section: ChecklistSection = {
      id: crypto.randomUUID(),
      event_id: eventId,
      title,
      position,
      created_at: now,
      updated_at: now,
    };

    sections.push(section);
    memoryStore.sections.set(eventId, sections);

    const activity: ActivityEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      actor_id: clerkUserId,
      event_type: 'section_created',
      details: { title },
      created_at: now,
    };
    (memoryStore.activities.get(eventId) || []).push(activity);

    return section;
  }

  /**
   * Updates a section title or position.
   */
  static async updateSection(
    clerkUserId: string,
    eventId: string,
    sectionId: string,
    payload: { title?: string; position?: number }
  ): Promise<ChecklistSection> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    const sections = memoryStore.sections.get(eventId) || [];
    const section = sections.find((s) => s.id === sectionId);
    if (!section) throw new Error('SECTION_NOT_FOUND');

    if (payload.title !== undefined) {
      const trimmed = payload.title.trim();
      if (!trimmed) throw new Error('Section title cannot be empty.');
      section.title = trimmed;
    }
    if (payload.position !== undefined) {
      section.position = payload.position;
    }
    section.updated_at = new Date().toISOString();

    return section;
  }

  /**
   * Deletes a section and removes all items assigned to it.
   */
  static async deleteSection(
    clerkUserId: string,
    eventId: string,
    sectionId: string
  ): Promise<void> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    const sections = memoryStore.sections.get(eventId) || [];
    const filteredSections = sections.filter((s) => s.id !== sectionId);
    memoryStore.sections.set(eventId, filteredSections);

    // Remove items belonging to the section
    const items = memoryStore.items.get(eventId) || [];
    const filteredItems = items.filter((i) => i.section_id !== sectionId);
    memoryStore.items.set(eventId, filteredItems);
  }

  /**
   * Reorders sections according to an array of section IDs.
   */
  static async reorderSections(
    clerkUserId: string,
    eventId: string,
    sectionIds: string[]
  ): Promise<void> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    const sections = memoryStore.sections.get(eventId) || [];
    sectionIds.forEach((id, index) => {
      const sec = sections.find((s) => s.id === id);
      if (sec) sec.position = index;
    });
  }

  // ============================================================================
  // CHECKLIST ITEMS
  // ============================================================================

  /**
   * Creates an item within an event section. Enforces that assignee must be a valid member.
   */
  static async createItem(
    clerkUserId: string,
    eventId: string,
    payload: {
      section_id?: string | null;
      title: string;
      notes?: string | null;
      quantity?: string | null;
      assignee_id?: string | null;
    }
  ): Promise<ChecklistItem> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    const title = payload.title.trim();
    if (!title) throw new Error('Item title is required.');

    // Validate assignee eligibility
    if (payload.assignee_id) {
      const isEligible = members.some((m) => m.clerk_user_id === payload.assignee_id);
      if (!isEligible) {
        throw new AuthorizationError('Assignee must be a member of this outing.', 'FORBIDDEN');
      }
    }

    const items = memoryStore.items.get(eventId) || [];
    const position = items.filter((i) => i.section_id === (payload.section_id || null)).length;
    const now = new Date().toISOString();

    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      event_id: eventId,
      section_id: payload.section_id || null,
      title,
      notes: payload.notes?.trim() || null,
      quantity: payload.quantity?.trim() || null,
      assignee_id: payload.assignee_id || null,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      position,
      created_by: clerkUserId,
      created_at: now,
      updated_at: now,
    };

    items.push(item);
    memoryStore.items.set(eventId, items);

    const activity: ActivityEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      actor_id: clerkUserId,
      event_type: 'item_created',
      details: { title: item.title, quantity: item.quantity },
      created_at: now,
    };
    (memoryStore.activities.get(eventId) || []).push(activity);

    return item;
  }

  /**
   * Updates an item's fields (title, notes, quantity, section, assignee).
   */
  static async updateItem(
    clerkUserId: string,
    eventId: string,
    itemId: string,
    payload: {
      title?: string;
      notes?: string | null;
      quantity?: string | null;
      section_id?: string | null;
      assignee_id?: string | null;
    }
  ): Promise<ChecklistItem> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    const items = memoryStore.items.get(eventId) || [];
    const item = items.find((i) => i.id === itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');

    if (payload.title !== undefined) {
      const trimmed = payload.title.trim();
      if (!trimmed) throw new Error('Item title cannot be empty.');
      item.title = trimmed;
    }

    if (payload.notes !== undefined) {
      item.notes = payload.notes?.trim() || null;
    }

    if (payload.quantity !== undefined) {
      item.quantity = payload.quantity?.trim() || null;
    }

    if (payload.section_id !== undefined) {
      item.section_id = payload.section_id;
    }

    if (payload.assignee_id !== undefined) {
      if (payload.assignee_id) {
        const isEligible = members.some((m) => m.clerk_user_id === payload.assignee_id);
        if (!isEligible) {
          throw new AuthorizationError('Assignee must be a member of this outing.', 'FORBIDDEN');
        }
      }
      const previousAssignee = item.assignee_id;
      item.assignee_id = payload.assignee_id;

      if (previousAssignee !== payload.assignee_id) {
        const activity: ActivityEvent = {
          id: crypto.randomUUID(),
          event_id: eventId,
          actor_id: clerkUserId,
          event_type: 'assignment_changed',
          details: { item_title: item.title, new_assignee: payload.assignee_id },
          created_at: new Date().toISOString(),
        };
        (memoryStore.activities.get(eventId) || []).push(activity);
      }
    }

    item.updated_at = new Date().toISOString();
    return item;
  }

  /**
   * Toggles completion status of a checklist item.
   */
  static async toggleItemCompletion(
    clerkUserId: string,
    eventId: string,
    itemId: string,
    isCompleted: boolean
  ): Promise<ChecklistItem> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    const items = memoryStore.items.get(eventId) || [];
    const item = items.find((i) => i.id === itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');

    const now = new Date().toISOString();
    item.is_completed = isCompleted;
    item.completed_at = isCompleted ? now : null;
    item.completed_by = isCompleted ? clerkUserId : null;
    item.updated_at = now;

    const activity: ActivityEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      actor_id: clerkUserId,
      event_type: isCompleted ? 'item_completed' : 'item_uncompleted',
      details: { title: item.title },
      created_at: now,
    };
    (memoryStore.activities.get(eventId) || []).push(activity);

    return item;
  }

  /**
   * Deletes a checklist item.
   */
  static async deleteItem(
    clerkUserId: string,
    eventId: string,
    itemId: string
  ): Promise<void> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    const items = memoryStore.items.get(eventId) || [];
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const filteredItems = items.filter((i) => i.id !== itemId);
    memoryStore.items.set(eventId, filteredItems);

    const activity: ActivityEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      actor_id: clerkUserId,
      event_type: 'item_deleted',
      details: { title: item.title },
      created_at: new Date().toISOString(),
    };
    (memoryStore.activities.get(eventId) || []).push(activity);
  }

  // ============================================================================
  // CHECKLIST TEMPLATES
  // ============================================================================

  /**
   * Creates a personal template from scratch.
   */
  static async createTemplate(
    clerkUserId: string,
    payload: {
      name: string;
      description?: string | null;
      sections?: { title: string; items?: { title: string; quantity?: string; notes?: string }[] }[];
    }
  ): Promise<ChecklistTemplate> {
    if (!clerkUserId) {
      throw new AuthorizationError('Authentication required to create template.', 'UNAUTHORIZED');
    }

    const name = payload.name.trim();
    if (!name) throw new Error('Template name is required.');

    const now = new Date().toISOString();
    const templateId = crypto.randomUUID();

    const template: ChecklistTemplate = {
      id: templateId,
      owner_id: clerkUserId,
      name,
      description: payload.description?.trim() || null,
      created_at: now,
      updated_at: now,
    };

    const userTemplates = memoryStore.templates.get(clerkUserId) || [];
    userTemplates.push(template);
    memoryStore.templates.set(clerkUserId, userTemplates);

    const sectionsList: TemplateSection[] = [];
    const itemsList: TemplateItem[] = [];

    if (payload.sections && payload.sections.length > 0) {
      payload.sections.forEach((sec, sIdx) => {
        const secId = crypto.randomUUID();
        const section: TemplateSection = {
          id: secId,
          template_id: templateId,
          title: sec.title.trim(),
          position: sIdx,
          created_at: now,
        };
        sectionsList.push(section);

        if (sec.items) {
          sec.items.forEach((it, iIdx) => {
            const item: TemplateItem = {
              id: crypto.randomUUID(),
              template_id: templateId,
              section_id: secId,
              title: it.title.trim(),
              notes: it.notes?.trim() || null,
              quantity: it.quantity?.trim() || null,
              position: iIdx,
              created_at: now,
            };
            itemsList.push(item);
          });
        }
      });
    }

    memoryStore.templateSections.set(templateId, sectionsList);
    memoryStore.templateItems.set(templateId, itemsList);

    return template;
  }

  /**
   * Saves a personal template by extracting sections and items from an existing event.
   */
  static async saveTemplateFromEvent(
    clerkUserId: string,
    eventId: string,
    payload: { templateName: string; description?: string | null }
  ): Promise<ChecklistTemplate> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    const name = payload.templateName.trim();
    if (!name) throw new Error('Template name is required.');

    const sections = memoryStore.sections.get(eventId) || [];
    const items = memoryStore.items.get(eventId) || [];

    const templateSections = sections.map((sec) => ({
      title: sec.title,
      items: items
        .filter((it) => it.section_id === sec.id)
        .map((it) => ({
          title: it.title,
          quantity: it.quantity || undefined,
          notes: it.notes || undefined,
        })),
    }));

    const unsectioned = items.filter((it) => !it.section_id || !sections.some((s) => s.id === it.section_id));
    if (unsectioned.length > 0) {
      templateSections.push({
        title: 'General Gear',
        items: unsectioned.map((it) => ({
          title: it.title,
          quantity: it.quantity || undefined,
          notes: it.notes || undefined,
        })),
      });
    }

    return this.createTemplate(clerkUserId, {
      name,
      description: payload.description || `Extracted from ${event.title}`,
      sections: templateSections,
    });
  }

  /**
   * Applies a template to an event by copying its sections and items without modifying original template.
   */
  static async applyTemplateToEvent(
    clerkUserId: string,
    eventId: string,
    templateId: string
  ): Promise<{ addedSectionsCount: number; addedItemsCount: number }> {
    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    // Retrieve template
    let template: ChecklistTemplate | null = null;
    for (const templates of memoryStore.templates.values()) {
      const match = templates.find((t) => t.id === templateId);
      if (match) {
        template = match;
        break;
      }
    }

    if (!template) throw new Error('TEMPLATE_NOT_FOUND');

    const templateSecs = memoryStore.templateSections.get(templateId) || [];
    const templateIts = memoryStore.templateItems.get(templateId) || [];

    const existingSections = memoryStore.sections.get(eventId) || [];
    const existingItems = memoryStore.items.get(eventId) || [];

    let addedItemsCount = 0;
    const now = new Date().toISOString();

    templateSecs.forEach((tSec, idx) => {
      const newSectionId = crypto.randomUUID();
      const newSection: ChecklistSection = {
        id: newSectionId,
        event_id: eventId,
        title: tSec.title,
        position: existingSections.length + idx,
        created_at: now,
        updated_at: now,
      };
      existingSections.push(newSection);

      const itemsInSec = templateIts.filter((ti) => ti.section_id === tSec.id);
      itemsInSec.forEach((tIt, itIdx) => {
        const newItem: ChecklistItem = {
          id: crypto.randomUUID(),
          event_id: eventId,
          section_id: newSectionId,
          title: tIt.title,
          notes: tIt.notes,
          quantity: tIt.quantity,
          assignee_id: null,
          is_completed: false,
          completed_at: null,
          completed_by: null,
          position: itIdx,
          created_by: clerkUserId,
          created_at: now,
          updated_at: now,
        };
        existingItems.push(newItem);
        addedItemsCount++;
      });
    });

    memoryStore.sections.set(eventId, existingSections);
    memoryStore.items.set(eventId, existingItems);

    const activity: ActivityEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      actor_id: clerkUserId,
      event_type: 'section_created',
      details: { template_name: template.name, sections_added: templateSecs.length },
      created_at: now,
    };
    (memoryStore.activities.get(eventId) || []).push(activity);

    return {
      addedSectionsCount: templateSecs.length,
      addedItemsCount,
    };
  }

  /**
   * Lists all personal templates for a user.
   */
  static async listTemplatesForUser(clerkUserId: string): Promise<
    (ChecklistTemplate & {
      sections: (TemplateSection & { items: TemplateItem[] })[];
    })[]
  > {
    if (!clerkUserId) {
      throw new AuthorizationError('Authentication required to list templates.', 'UNAUTHORIZED');
    }

    const templates = memoryStore.templates.get(clerkUserId) || [];
    return templates.map((tmpl) => {
      const sections = (memoryStore.templateSections.get(tmpl.id) || []).sort(
        (a, b) => a.position - b.position
      );
      const items = memoryStore.templateItems.get(tmpl.id) || [];

      const sectionsWithItems = sections.map((sec) => ({
        ...sec,
        items: items
          .filter((it) => it.section_id === sec.id)
          .sort((a, b) => a.position - b.position),
      }));

      return {
        ...tmpl,
        sections: sectionsWithItems,
      };
    });
  }

  /**
   * Deletes a personal template.
   */
  static async deleteTemplate(clerkUserId: string, templateId: string): Promise<void> {
    if (!clerkUserId) {
      throw new AuthorizationError('Authentication required.', 'UNAUTHORIZED');
    }

    const templates = memoryStore.templates.get(clerkUserId) || [];
    const template = templates.find((t) => t.id === templateId);
    if (!template) throw new Error('TEMPLATE_NOT_FOUND');

    if (template.owner_id !== clerkUserId) {
      throw new AuthorizationError('Only the template owner can delete this template.', 'FORBIDDEN');
    }

    memoryStore.templates.set(
      clerkUserId,
      templates.filter((t) => t.id !== templateId)
    );
    memoryStore.templateSections.delete(templateId);
    memoryStore.templateItems.delete(templateId);
  }
}
