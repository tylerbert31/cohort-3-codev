import { supabaseAdmin } from '@/server/db/supabase-admin';
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
  Json,
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
interface MemoryStoreState {
  profiles: Map<string, Profile>;
  events: Map<string, Event>;
  members: Map<string, EventMember[]>;
  invites: Map<string, EventInvite[]>;
  activities: Map<string, ActivityEvent[]>;
  sections: Map<string, ChecklistSection[]>;
  items: Map<string, ChecklistItem[]>;
  templates: Map<string, ChecklistTemplate[]>;
  templateSections: Map<string, TemplateSection[]>;
  templateItems: Map<string, TemplateItem[]>;
}

const globalForStore = globalThis as unknown as {
  __COHORT_MEMORY_STORE__?: MemoryStoreState;
};

const memoryStore: MemoryStoreState = (globalForStore.__COHORT_MEMORY_STORE__ ??= {
  profiles: new Map<string, Profile>(),
  events: new Map<string, Event>(),
  members: new Map<string, EventMember[]>(),
  invites: new Map<string, EventInvite[]>(),
  activities: new Map<string, ActivityEvent[]>(),
  sections: new Map<string, ChecklistSection[]>(),
  items: new Map<string, ChecklistItem[]>(),
  templates: new Map<string, ChecklistTemplate[]>(),
  templateSections: new Map<string, TemplateSection[]>,
  templateItems: new Map<string, TemplateItem[]>(),
});

function isTestEnv(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_STORE === 'true';
}

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

    if (!isTestEnv()) {
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              clerk_user_id: updated.clerk_user_id,
              first_name: updated.first_name,
              last_name: updated.last_name,
              image_url: updated.image_url,
              updated_at: now,
            },
            { onConflict: 'clerk_user_id' }
          )
          .select('*')
          .single();

        if (!error && data) {
          memoryStore.profiles.set(profile.clerk_user_id, data as Profile);
          return data as Profile;
        }
      } catch (err) {
        console.warn('Supabase upsertProfile fallback to memory:', err);
      }
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

    // Keep memory store in sync
    memoryStore.events.set(eventId, event);
    memoryStore.members.set(eventId, [ownerMember]);
    memoryStore.activities.set(eventId, [activity]);
    memoryStore.sections.set(eventId, []);
    memoryStore.items.set(eventId, []);

    if (!isTestEnv()) {
      // Guarantee profile exists first so foreign key doesn't fail
      await this.upsertProfile({ clerk_user_id: ownerClerkId });

      const { data: createdEventData, error: eventErr } = await supabaseAdmin
        .from('events')
        .insert({
          id: event.id,
          owner_id: event.owner_id,
          title: event.title,
          description: event.description,
          location: event.location,
          start_date: event.start_date,
          end_date: event.end_date,
          status: event.status,
        })
        .select('*')
        .single();

      if (eventErr) {
        console.error('Supabase createEvent error:', eventErr);
        throw new Error(`Failed to create event: ${eventErr.message}`);
      }

      const { data: createdMemberData, error: memberErr } = await supabaseAdmin
        .from('event_members')
        .insert({
          id: ownerMember.id,
          event_id: ownerMember.event_id,
          clerk_user_id: ownerMember.clerk_user_id,
          role: ownerMember.role,
        })
        .select('*')
        .single();

      if (memberErr) {
        console.error('Supabase createEvent member error:', memberErr);
        throw new Error(`Failed to record event owner: ${memberErr.message}`);
      }

      await supabaseAdmin.from('activity_events').insert({
        id: activity.id,
        event_id: activity.event_id,
        actor_id: activity.actor_id,
        event_type: activity.event_type,
        details: activity.details as Json,
      });

      return {
        event: (createdEventData || event) as Event,
        ownerMember: (createdMemberData || ownerMember) as EventMember,
      };
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

    if (!isTestEnv()) {
      const { data: eventData, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !eventData) {
        throw new Error('EVENT_NOT_FOUND');
      }

      const event = eventData as Event;

      const { data: membersData, error: membersErr } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      if (membersErr) {
        throw new Error(`Failed to fetch event members: ${membersErr.message}`);
      }

      const members = (membersData || []) as EventMember[];
      const currentMember = assertEventMembership(clerkUserId, members);

      // Fetch member profiles
      const memberUserIds = members.map((m) => m.clerk_user_id);
      const { data: profilesData } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('clerk_user_id', memberUserIds.length ? memberUserIds : ['__none__']);

      const profileMap = new Map<string, Profile>(
        ((profilesData || []) as Profile[]).map((p) => [p.clerk_user_id, p])
      );

      const membersWithProfiles = members.map((m) => ({
        ...m,
        profile: profileMap.get(m.clerk_user_id),
      }));

      // Fetch sections
      const { data: sectionsData } = await supabaseAdmin
        .from('checklist_sections')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });

      const rawSections = (sectionsData || []) as ChecklistSection[];

      // Fetch items
      const { data: itemsData } = await supabaseAdmin
        .from('checklist_items')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });

      const rawItems = (itemsData || []) as ChecklistItem[];

      // Assignees
      const assigneeIds = rawItems
        .map((i) => i.assignee_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0 && !profileMap.has(id));

      if (assigneeIds.length > 0) {
        const { data: moreProfiles } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .in('clerk_user_id', assigneeIds);

        ((moreProfiles || []) as Profile[]).forEach((p) => profileMap.set(p.clerk_user_id, p));
      }

      const sectionsWithItems = rawSections.map((sec) => {
        const items = rawItems
          .filter((it) => it.section_id === sec.id)
          .map((it) => ({
            ...it,
            assignee: it.assignee_id ? profileMap.get(it.assignee_id) || null : null,
          }));
        return { ...sec, items };
      });

      const unsectionedItems = rawItems
        .filter((it) => !it.section_id || !rawSections.some((s) => s.id === it.section_id))
        .map((it) => ({
          ...it,
          assignee: it.assignee_id ? profileMap.get(it.assignee_id) || null : null,
        }));

      // Activities
      const { data: activitiesData } = await supabaseAdmin
        .from('activity_events')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      return {
        event,
        members: membersWithProfiles,
        activities: (activitiesData || []) as ActivityEvent[],
        sections: sectionsWithItems,
        unsectionedItems,
        userRole: currentMember.role,
      };
    }

    // Memory store path
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

    const activities = [...(memoryStore.activities.get(eventId) || [])]
      .reverse()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

    if (!isTestEnv()) {
      const { data: memberRows, error: memberErr } = await supabaseAdmin
        .from('event_members')
        .select('event_id')
        .eq('clerk_user_id', clerkUserId);

      if (memberErr) throw memberErr;

      const eventIds = Array.from(new Set((memberRows || []).map((m) => m.event_id)));

      if (eventIds.length > 0) {
        const { data: eventsData, error: eventsErr } = await supabaseAdmin
          .from('events')
          .select('*')
          .in('id', eventIds)
          .order('created_at', { ascending: false });

        if (eventsErr) throw eventsErr;

        const { data: itemsData } = await supabaseAdmin
          .from('checklist_items')
          .select('event_id, is_completed')
          .in('event_id', eventIds);

        const itemCountMap = new Map<string, { total: number; completed: number }>();
        ((itemsData || []) as { event_id: string; is_completed: boolean }[]).forEach((it) => {
          const current = itemCountMap.get(it.event_id) || { total: 0, completed: 0 };
          current.total += 1;
          if (it.is_completed) current.completed += 1;
          itemCountMap.set(it.event_id, current);
        });

        const active: (Event & { itemCount: number; completedItemCount: number })[] = [];
        const archived: (Event & { itemCount: number; completedItemCount: number })[] = [];
        const completed: (Event & { itemCount: number; completedItemCount: number })[] = [];

        ((eventsData || []) as Event[]).forEach((evt) => {
          const counts = itemCountMap.get(evt.id) || { total: 0, completed: 0 };
          const eventWithCounts = {
            ...evt,
            itemCount: counts.total,
            completedItemCount: counts.completed,
          };

          if (evt.status === 'completed') completed.push(eventWithCounts);
          else if (evt.status === 'archived') archived.push(eventWithCounts);
          else active.push(eventWithCounts);
        });

        return { active, archived, completed };
      } else {
        return { active: [], archived: [], completed: [] };
      }
    }

    // Memory store path
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
    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');

      assertEventNotCompleted(event.status);
      assertEventOwner(clerkUserId, event.owner_id);

      const now = new Date().toISOString();
      const { data: updatedEvent, error: updateErr } = await supabaseAdmin
        .from('events')
        .update({ status: 'archived', archived_at: now, updated_at: now })
        .eq('id', eventId)
        .select('*')
        .single();

      if (updateErr) throw new Error(`Failed to archive event: ${updateErr.message}`);

      await supabaseAdmin.from('activity_events').insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        actor_id: clerkUserId,
        event_type: 'event_archived',
        details: { title: event.title } as Json,
        created_at: now,
      });

      return updatedEvent as Event;
    }

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
    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');

      assertEventNotCompleted(event.status);
      assertEventOwner(clerkUserId, event.owner_id);

      const now = new Date().toISOString();
      const { data: updatedEvent, error: updateErr } = await supabaseAdmin
        .from('events')
        .update({ status: 'active', archived_at: null, updated_at: now })
        .eq('id', eventId)
        .select('*')
        .single();

      if (updateErr) throw new Error(`Failed to restore event: ${updateErr.message}`);

      await supabaseAdmin.from('activity_events').insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        actor_id: clerkUserId,
        event_type: 'event_restored',
        details: { title: event.title } as Json,
        created_at: now,
      });

      return updatedEvent as Event;
    }

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
    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');

      assertEventNotCompleted(event.status);
      assertEventOwner(clerkUserId, event.owner_id);

      const now = new Date().toISOString();
      const { data: updatedEvent, error: updateErr } = await supabaseAdmin
        .from('events')
        .update({ status: 'completed', completed_at: now, updated_at: now })
        .eq('id', eventId)
        .select('*')
        .single();

      if (updateErr) throw new Error(`Failed to complete event: ${updateErr.message}`);

      await supabaseAdmin.from('activity_events').insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        actor_id: clerkUserId,
        event_type: 'event_completed',
        details: { title: event.title } as Json,
        created_at: now,
      });

      return updatedEvent as Event;
    }

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
    if (!isTestEnv()) {
      const { data: eventData, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !eventData) {
        throw new Error('EVENT_NOT_FOUND');
      }

      assertEventNotCompleted(eventData.status);

      const { data: membersData, error: membersErr } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      if (membersErr) throw new Error(`Failed to verify members: ${membersErr.message}`);

      const members = (membersData || []) as EventMember[];
      assertEventMembership(clerkUserId, members);

      // Check for an existing active invite in Supabase
      const { data: existingActive } = await supabaseAdmin
        .from('event_invites')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .is('revoked_at', null)
        .maybeSingle();

      if (existingActive) {
        return existingActive as EventInvite;
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

      const { data: insertedInvite, error: insertErr } = await supabaseAdmin
        .from('event_invites')
        .insert(invite)
        .select('*')
        .single();

      if (insertErr) {
        throw new Error(`Failed to create invite: ${insertErr.message}`);
      }

      return insertedInvite as EventInvite;
    }

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

    if (!isTestEnv()) {
      const { data: invite, error: inviteErr } = await supabaseAdmin
        .from('event_invites')
        .select('*, events!inner(owner_id)')
        .eq('invite_code', normalizedCode)
        .maybeSingle();

      if (inviteErr || !invite) {
        throw new AuthorizationError('Invite code not found.', 'INVALID_INVITE');
      }

      const ownerId = (invite as unknown as { events: { owner_id: string } }).events?.owner_id;
      assertEventOwner(clerkUserId, ownerId);

      const now = new Date().toISOString();
      const { error: updateErr } = await supabaseAdmin
        .from('event_invites')
        .update({ is_active: false, revoked_at: now })
        .eq('id', invite.id);

      if (updateErr) {
        throw new Error(`Failed to revoke invite: ${updateErr.message}`);
      }

      return;
    }

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

    const now = new Date().toISOString();
    foundInvite.is_active = false;
    foundInvite.revoked_at = now;
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

    if (!isTestEnv()) {
      const { data, error } = await supabaseAdmin
        .from('event_invites')
        .select('event_id')
        .eq('invite_code', normalizedCode)
        .eq('is_active', true)
        .is('revoked_at', null)
        .maybeSingle();

      if (!error && data) {
        return { valid: true, eventId: data.event_id };
      }
      return { valid: false };
    }

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

    if (!isTestEnv()) {
      // 1. Fetch event from Supabase
      const { data: eventData, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !eventData) {
        throw new Error('EVENT_NOT_FOUND');
      }

      assertEventNotCompleted(eventData.status);

      // 2. Check if already a member in Supabase
      const { data: existingMember } = await supabaseAdmin
        .from('event_members')
        .select('id')
        .eq('event_id', eventId)
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();

      if (existingMember) {
        return { success: true, eventId, alreadyMember: true };
      }

      // 3. Guarantee user profile exists so foreign key constraint never fails
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('clerk_user_id')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();

      if (!existingProfile) {
        await this.upsertProfile({ clerk_user_id: clerkUserId });
      }

      const now = new Date().toISOString();
      const newMemberId = crypto.randomUUID();

      // 4. Insert new member record into Supabase
      const { data: insertedMember, error: insertErr } = await supabaseAdmin
        .from('event_members')
        .insert({
          id: newMemberId,
          event_id: eventId,
          clerk_user_id: clerkUserId,
          role: 'participant',
          joined_at: now,
        })
        .select('*')
        .single();

      if (insertErr) {
        // Unique constraint check: already a member
        if (insertErr.code === '23505') {
          return { success: true, eventId, alreadyMember: true };
        }
        console.error('Failed to join event in Supabase:', insertErr);
        throw new Error(`Failed to join event: ${insertErr.message}`);
      }

      // 5. Insert activity record into Supabase
      await supabaseAdmin.from('activity_events').insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        actor_id: clerkUserId,
        event_type: 'member_joined',
        details: { role: 'participant' } as Json,
        created_at: now,
      });

      // Keep memory store in sync if populated
      const memMembers = memoryStore.members.get(eventId);
      if (memMembers && insertedMember) {
        memMembers.push(insertedMember as EventMember);
      }

      return { success: true, eventId, alreadyMember: false };
    }

    // Memory store path for test environment
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
    const title = payload.title.trim();
    if (!title) throw new Error('Section title is required.');

    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');
      assertEventNotCompleted(event.status);

      const { data: membersData, error: memErr } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      if (memErr) throw new Error(`Failed to verify members: ${memErr.message}`);
      assertEventMembership(clerkUserId, (membersData || []) as EventMember[]);

      const { count } = await supabaseAdmin
        .from('checklist_sections')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      const position = payload.position ?? (count || 0);
      const sectionId = crypto.randomUUID();
      const now = new Date().toISOString();

      const { data: section, error: secErr } = await supabaseAdmin
        .from('checklist_sections')
        .insert({
          id: sectionId,
          event_id: eventId,
          title,
          position,
        })
        .select('*')
        .single();

      if (secErr) throw new Error(`Failed to create section: ${secErr.message}`);

      await supabaseAdmin.from('activity_events').insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        actor_id: clerkUserId,
        event_type: 'section_created',
        details: { title } as Json,
        created_at: now,
      });

      return section as ChecklistSection;
    }

    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

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
    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');
      assertEventNotCompleted(event.status);

      const { data: membersData } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      assertEventMembership(clerkUserId, (membersData || []) as EventMember[]);

      const updateData: { title?: string; position?: number; updated_at: string } = { updated_at: new Date().toISOString() };
      if (payload.title !== undefined) {
        const trimmed = payload.title.trim();
        if (!trimmed) throw new Error('Section title cannot be empty.');
        updateData.title = trimmed;
      }
      if (payload.position !== undefined) {
        updateData.position = payload.position;
      }

      const { data: updatedSection, error: updateErr } = await supabaseAdmin
        .from('checklist_sections')
        .update(updateData)
        .eq('id', sectionId)
        .select('*')
        .single();

      if (updateErr) throw new Error(`Failed to update section: ${updateErr.message}`);
      return updatedSection as ChecklistSection;
    }

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
    sectionId: string,
    options?: { keepItems?: boolean }
  ): Promise<void> {
    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');
      assertEventNotCompleted(event.status);

      const { data: membersData } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      assertEventMembership(clerkUserId, (membersData || []) as EventMember[]);

      if (options?.keepItems) {
        await supabaseAdmin
          .from('checklist_items')
          .update({ section_id: null, updated_at: new Date().toISOString() })
          .eq('section_id', sectionId);
      } else {
        await supabaseAdmin
          .from('checklist_items')
          .delete()
          .eq('section_id', sectionId);
      }

      const { error: delErr } = await supabaseAdmin
        .from('checklist_sections')
        .delete()
        .eq('id', sectionId);

      if (delErr) throw new Error(`Failed to delete section: ${delErr.message}`);
      return;
    }

    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    const sections = memoryStore.sections.get(eventId) || [];
    const filteredSections = sections.filter((s) => s.id !== sectionId);
    memoryStore.sections.set(eventId, filteredSections);

    const items = memoryStore.items.get(eventId) || [];
    if (options?.keepItems) {
      items.forEach((item) => {
        if (item.section_id === sectionId) {
          item.section_id = null;
          item.updated_at = new Date().toISOString();
        }
      });
      memoryStore.items.set(eventId, items);
    } else {
      const filteredItems = items.filter((i) => i.section_id !== sectionId);
      memoryStore.items.set(eventId, filteredItems);
    }
  }

  /**
   * Reorders sections according to an array of section IDs.
   */
  static async reorderSections(
    clerkUserId: string,
    eventId: string,
    sectionIds: string[]
  ): Promise<void> {
    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');
      assertEventNotCompleted(event.status);

      const { data: membersData } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      assertEventMembership(clerkUserId, (membersData || []) as EventMember[]);

      await Promise.all(
        sectionIds.map((id, index) =>
          supabaseAdmin
            .from('checklist_sections')
            .update({ position: index, updated_at: new Date().toISOString() })
            .eq('id', id)
        )
      );
      return;
    }

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
      deadline?: string | null;
    }
  ): Promise<ChecklistItem> {
    const title = payload.title.trim();
    if (!title) throw new Error('Item title is required.');

    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');
      assertEventNotCompleted(event.status);

      const { data: membersData, error: memErr } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      if (memErr) throw new Error(`Failed to verify members: ${memErr.message}`);
      const members = (membersData || []) as EventMember[];
      assertEventMembership(clerkUserId, members);

      if (payload.assignee_id) {
        const isEligible = members.some((m) => m.clerk_user_id === payload.assignee_id);
        if (!isEligible) {
          throw new AuthorizationError('Assignee must be a member of this outing.', 'FORBIDDEN');
        }
      }

      const { count } = await supabaseAdmin
        .from('checklist_items')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      const position = count || 0;
      const itemId = crypto.randomUUID();
      const now = new Date().toISOString();

      const { data: newItem, error: itemErr } = await supabaseAdmin
        .from('checklist_items')
        .insert({
          id: itemId,
          event_id: eventId,
          section_id: payload.section_id || null,
          title,
          notes: payload.notes?.trim() || null,
          quantity: payload.quantity?.trim() || null,
          assignee_id: payload.assignee_id || null,
          deadline: payload.deadline?.trim() || null,
          is_completed: false,
          position,
          created_by: clerkUserId,
        })
        .select('*')
        .single();

      if (itemErr) throw new Error(`Failed to create item: ${itemErr.message}`);

      await supabaseAdmin.from('activity_events').insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        actor_id: clerkUserId,
        event_type: 'item_created',
        details: { title, quantity: payload.quantity?.trim() || null } as Json,
        created_at: now,
      });

      return newItem as ChecklistItem;
    }

    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    assertEventNotCompleted(event.status);
    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

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
      deadline: payload.deadline?.trim() || null,
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
      deadline?: string | null;
    }
  ): Promise<ChecklistItem> {
    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');
      assertEventNotCompleted(event.status);

      const { data: membersData } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      const members = (membersData || []) as EventMember[];
      assertEventMembership(clerkUserId, members);

      const { data: currentItem, error: getErr } = await supabaseAdmin
        .from('checklist_items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();

      if (getErr || !currentItem) throw new Error('ITEM_NOT_FOUND');

      const updateData: { title?: string; notes?: string | null; quantity?: string | null; section_id?: string | null; assignee_id?: string | null; deadline?: string | null; updated_at: string } = { updated_at: new Date().toISOString() };

      if (payload.title !== undefined) {
        const trimmed = payload.title.trim();
        if (!trimmed) throw new Error('Item title cannot be empty.');
        updateData.title = trimmed;
      }
      if (payload.notes !== undefined) updateData.notes = payload.notes?.trim() || null;
      if (payload.quantity !== undefined) updateData.quantity = payload.quantity?.trim() || null;
      if (payload.section_id !== undefined) updateData.section_id = payload.section_id;
      if (payload.deadline !== undefined) updateData.deadline = payload.deadline?.trim() || null;

      if (payload.assignee_id !== undefined) {
        if (payload.assignee_id) {
          const isEligible = members.some((m) => m.clerk_user_id === payload.assignee_id);
          if (!isEligible) {
            throw new AuthorizationError('Assignee must be a member of this outing.', 'FORBIDDEN');
          }
        }
        updateData.assignee_id = payload.assignee_id;

        if (currentItem.assignee_id !== payload.assignee_id) {
          await supabaseAdmin.from('activity_events').insert({
            id: crypto.randomUUID(),
            event_id: eventId,
            actor_id: clerkUserId,
            event_type: 'assignment_changed',
            details: { item_title: updateData.title || currentItem.title, new_assignee: payload.assignee_id } as Json,
            created_at: new Date().toISOString(),
          });
        }
      }

      const { data: updatedItem, error: updateErr } = await supabaseAdmin
        .from('checklist_items')
        .update(updateData)
        .eq('id', itemId)
        .select('*')
        .single();

      if (updateErr) throw new Error(`Failed to update item: ${updateErr.message}`);
      return updatedItem as ChecklistItem;
    }

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

    if (payload.deadline !== undefined) {
      item.deadline = payload.deadline?.trim() || null;
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
    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');
      assertEventNotCompleted(event.status);

      const { data: membersData } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      assertEventMembership(clerkUserId, (membersData || []) as EventMember[]);

      const { data: item, error: itemErr } = await supabaseAdmin
        .from('checklist_items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();

      if (itemErr || !item) throw new Error('ITEM_NOT_FOUND');

      const now = new Date().toISOString();
      const { data: updatedItem, error: updateErr } = await supabaseAdmin
        .from('checklist_items')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? now : null,
          completed_by: isCompleted ? clerkUserId : null,
          updated_at: now,
        })
        .eq('id', itemId)
        .select('*')
        .single();

      if (updateErr) throw new Error(`Failed to toggle item completion: ${updateErr.message}`);

      await supabaseAdmin.from('activity_events').insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        actor_id: clerkUserId,
        event_type: isCompleted ? 'item_completed' : 'item_uncompleted',
        details: { title: item.title } as Json,
        created_at: now,
      });

      return updatedItem as ChecklistItem;
    }

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
    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');
      assertEventNotCompleted(event.status);

      const { data: membersData } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      assertEventMembership(clerkUserId, (membersData || []) as EventMember[]);

      const { data: item } = await supabaseAdmin
        .from('checklist_items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();

      if (!item) return;

      const { error: delErr } = await supabaseAdmin
        .from('checklist_items')
        .delete()
        .eq('id', itemId);

      if (delErr) throw new Error(`Failed to delete item: ${delErr.message}`);

      await supabaseAdmin.from('activity_events').insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        actor_id: clerkUserId,
        event_type: 'item_deleted',
        details: { title: item.title } as Json,
        created_at: new Date().toISOString(),
      });

      return;
    }

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

    if (!isTestEnv()) {
      // Guarantee profile exists first
      await this.upsertProfile({ clerk_user_id: clerkUserId });

      const { data: tmplData, error: tmplErr } = await supabaseAdmin
        .from('checklist_templates')
        .insert({
          id: template.id,
          owner_id: template.owner_id,
          name: template.name,
          description: template.description,
        })
        .select('*')
        .single();

      if (tmplErr) throw new Error(`Failed to create template: ${tmplErr.message}`);

      if (sectionsList.length > 0) {
        await supabaseAdmin.from('template_sections').insert(
          sectionsList.map((s) => ({
            id: s.id,
            template_id: s.template_id,
            title: s.title,
            position: s.position,
          }))
        );
      }

      if (itemsList.length > 0) {
        await supabaseAdmin.from('template_items').insert(
          itemsList.map((i) => ({
            id: i.id,
            template_id: i.template_id,
            section_id: i.section_id,
            title: i.title,
            notes: i.notes,
            quantity: i.quantity,
            position: i.position,
          }))
        );
      }

      return (tmplData || template) as ChecklistTemplate;
    }

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
    const name = payload.templateName.trim();
    if (!name) throw new Error('Template name is required.');

    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');

      const { data: membersData } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      assertEventMembership(clerkUserId, (membersData || []) as EventMember[]);

      const { data: sectionsData } = await supabaseAdmin
        .from('checklist_sections')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });

      const { data: itemsData } = await supabaseAdmin
        .from('checklist_items')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });

      const sections = (sectionsData || []) as ChecklistSection[];
      const items = (itemsData || []) as ChecklistItem[];

      if (sections.length === 0 && items.length === 0) {
        throw new Error('Cannot save template from an empty trip. Add items or categories before creating a template.');
      }

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

    const event = memoryStore.events.get(eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    const members = memoryStore.members.get(eventId) || [];
    assertEventMembership(clerkUserId, members);

    const sections = memoryStore.sections.get(eventId) || [];
    const items = memoryStore.items.get(eventId) || [];

    if (sections.length === 0 && items.length === 0) {
      throw new Error('Cannot save template from an empty trip. Add items or categories before creating a template.');
    }

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
    if (!isTestEnv()) {
      const { data: event, error: eventErr } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (eventErr || !event) throw new Error('EVENT_NOT_FOUND');
      assertEventNotCompleted(event.status);

      const { data: membersData } = await supabaseAdmin
        .from('event_members')
        .select('*')
        .eq('event_id', eventId);

      assertEventMembership(clerkUserId, (membersData || []) as EventMember[]);

      const { data: template, error: tmplErr } = await supabaseAdmin
        .from('checklist_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();

      if (tmplErr || !template) throw new Error('TEMPLATE_NOT_FOUND');

      const { data: existingSecs } = await supabaseAdmin
        .from('checklist_sections')
        .select('id')
        .eq('event_id', eventId);

      const { data: existingIts } = await supabaseAdmin
        .from('checklist_items')
        .select('id')
        .eq('event_id', eventId);

      if ((existingSecs && existingSecs.length > 0) || (existingIts && existingIts.length > 0)) {
        throw new Error(
          'Cannot apply template to an event that already has items or categories. Templates can only be applied to empty events to avoid conflicts or duplicates.'
        );
      }

      const { data: templateSecsData } = await supabaseAdmin
        .from('template_sections')
        .select('*')
        .eq('template_id', templateId)
        .order('position', { ascending: true });

      const { data: templateItemsData } = await supabaseAdmin
        .from('template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('position', { ascending: true });

      const templateSecs = (templateSecsData || []) as TemplateSection[];
      const templateIts = (templateItemsData || []) as TemplateItem[];

      let addedItemsCount = 0;
      const now = new Date().toISOString();

      for (let idx = 0; idx < templateSecs.length; idx++) {
        const tSec = templateSecs[idx];
        const newSectionId = crypto.randomUUID();

        await supabaseAdmin.from('checklist_sections').insert({
          id: newSectionId,
          event_id: eventId,
          title: tSec.title,
          position: idx,
        });

        const itemsInSec = templateIts.filter((ti) => ti.section_id === tSec.id);
        if (itemsInSec.length > 0) {
          await supabaseAdmin.from('checklist_items').insert(
            itemsInSec.map((tIt, itIdx) => ({
              id: crypto.randomUUID(),
              event_id: eventId,
              section_id: newSectionId,
              title: tIt.title,
              notes: tIt.notes,
              quantity: tIt.quantity,
              assignee_id: null,
              is_completed: false,
              position: itIdx,
              created_by: clerkUserId,
            }))
          );
          addedItemsCount += itemsInSec.length;
        }
      }

      await supabaseAdmin.from('activity_events').insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        actor_id: clerkUserId,
        event_type: 'section_created',
        details: { template_name: template.name, sections_added: templateSecs.length } as Json,
        created_at: now,
      });

      return {
        addedSectionsCount: templateSecs.length,
        addedItemsCount,
      };
    }

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

    if (existingSections.length > 0 || existingItems.length > 0) {
      throw new Error(
        'Cannot apply template to an event that already has items or categories. Templates can only be applied to empty events to avoid conflicts or duplicates.'
      );
    }

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

    if (!isTestEnv()) {
      const { data: templatesData, error: tmplErr } = await supabaseAdmin
        .from('checklist_templates')
        .select('*')
        .eq('owner_id', clerkUserId)
        .order('created_at', { ascending: false });

      if (!tmplErr && templatesData) {
        const templates = templatesData as ChecklistTemplate[];
        const templateIds = templates.map((t) => t.id);

        if (templateIds.length > 0) {
          const { data: sectionsData } = await supabaseAdmin
            .from('template_sections')
            .select('*')
            .in('template_id', templateIds)
            .order('position', { ascending: true });

          const { data: itemsData } = await supabaseAdmin
            .from('template_items')
            .select('*')
            .in('template_id', templateIds)
            .order('position', { ascending: true });

          const rawSections = (sectionsData || []) as TemplateSection[];
          const rawItems = (itemsData || []) as TemplateItem[];

          return templates.map((tmpl) => {
            const sections = rawSections
              .filter((s) => s.template_id === tmpl.id)
              .map((sec) => ({
                ...sec,
                items: rawItems.filter((i) => i.section_id === sec.id),
              }));

            return {
              ...tmpl,
              sections,
            };
          });
        } else {
          return [];
        }
      }
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

    if (!isTestEnv()) {
      const { data: template, error: tmplErr } = await supabaseAdmin
        .from('checklist_templates')
        .select('owner_id')
        .eq('id', templateId)
        .maybeSingle();

      if (tmplErr || !template) throw new Error('TEMPLATE_NOT_FOUND');
      if (template.owner_id !== clerkUserId) {
        throw new AuthorizationError('Only the template owner can delete this template.', 'FORBIDDEN');
      }

      const { error: delErr } = await supabaseAdmin
        .from('checklist_templates')
        .delete()
        .eq('id', templateId);

      if (delErr) throw new Error(`Failed to delete template: ${delErr.message}`);
      return;
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
