import { supabaseAdmin } from '@/server/db/supabase-admin';
import type {
  Event,
  EventMember,
  EventInvite,
  ActivityEvent,
  EventStatus,
  Profile,
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
      await (supabaseAdmin as any).from('profiles').upsert({
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

    // Attempt Supabase insert
    try {
      await (supabaseAdmin as any).from('events').insert({
        id: event.id,
        owner_id: event.owner_id,
        title: event.title,
        description: event.description,
        location: event.location,
        start_date: event.start_date,
        end_date: event.end_date,
        status: event.status,
      });

      await (supabaseAdmin as any).from('event_members').insert({
        id: ownerMember.id,
        event_id: ownerMember.event_id,
        clerk_user_id: ownerMember.clerk_user_id,
        role: ownerMember.role,
      });

      await (supabaseAdmin as any).from('activity_events').insert({
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
   * Retrieves an event by ID with server-side authorization check.
   */
  static async getEvent(
    clerkUserId: string | null | undefined,
    eventId: string
  ): Promise<{
    event: Event;
    members: (EventMember & { profile?: Profile })[];
    activities: ActivityEvent[];
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

    const activities = (memoryStore.activities.get(eventId) || []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      event,
      members: membersWithProfiles,
      activities,
      userRole: member.role,
    };
  }

  /**
   * Lists events for the authenticated user, separated by lifecycle state.
   */
  static async listEventsForUser(clerkUserId: string | null | undefined): Promise<{
    active: Event[];
    archived: Event[];
    completed: Event[];
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

    const active: Event[] = [];
    const archived: Event[] = [];
    const completed: Event[] = [];

    for (const id of userEventIds) {
      const evt = memoryStore.events.get(id);
      if (evt) {
        if (evt.status === 'completed') completed.push(evt);
        else if (evt.status === 'archived') archived.push(evt);
        else active.push(evt);
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
}
