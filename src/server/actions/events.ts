'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { EventsRepository } from '@/server/db/events-repository';
import type { Event, EventMember, ActivityEvent, Profile } from '@/types/database';

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
}

export type ActionResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * Creates a new event with atomic owner membership and an initial activity event.
 */
export async function createEventAction(
  input: CreateEventInput
): Promise<ActionResponse<{ event: Event; ownerMember: EventMember }>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const user = await currentUser();
    if (user) {
      await EventsRepository.upsertProfile({
        clerk_user_id: userId,
        first_name: user.firstName,
        last_name: user.lastName,
        image_url: user.imageUrl,
      });
    }

    const result = await EventsRepository.createEvent(userId, input);

    revalidatePath('/');
    return { success: true, data: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create event.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves event details, member list, and activity feed with server-side authorization check.
 */
export async function getEventDetailsAction(eventId: string): Promise<
  ActionResponse<{
    event: Event;
    members: (EventMember & { profile?: Profile })[];
    activities: ActivityEvent[];
    userRole: 'owner' | 'participant';
  }>
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const result = await EventsRepository.getEvent(userId, eventId);
    return { success: true, data: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch event.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

/**
 * Lists all active, archived, and completed events for the authenticated user.
 */
export async function listUserEventsAction(): Promise<
  ActionResponse<{
    active: Event[];
    archived: Event[];
    completed: Event[];
  }>
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const user = await currentUser();
    if (user) {
      await EventsRepository.upsertProfile({
        clerk_user_id: userId,
        first_name: user.firstName,
        last_name: user.lastName,
        image_url: user.imageUrl,
      });
    }

    const result = await EventsRepository.listEventsForUser(userId);
    return { success: true, data: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list events.';
    return { success: false, error: message };
  }
}

/**
 * Archives an active event (Owner only).
 */
export async function archiveEventAction(eventId: string): Promise<ActionResponse<Event>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const event = await EventsRepository.archiveEvent(userId, eventId);
    revalidatePath('/');
    revalidatePath(`/events/${eventId}`);
    return { success: true, data: event };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to archive event.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

/**
 * Restores an archived event to active state (Owner only).
 */
export async function restoreEventAction(eventId: string): Promise<ActionResponse<Event>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const event = await EventsRepository.restoreEvent(userId, eventId);
    revalidatePath('/');
    revalidatePath(`/events/${eventId}`);
    return { success: true, data: event };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to restore event.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

/**
 * Permanently locks an event upon completion (Owner only).
 */
export async function completeEventAction(eventId: string): Promise<ActionResponse<Event>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const event = await EventsRepository.completeEvent(userId, eventId);
    revalidatePath('/');
    revalidatePath(`/events/${eventId}`);
    return { success: true, data: event };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to complete event.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}
