'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { EventsRepository } from '@/server/db/events-repository';
import type { EventInvite } from '@/types/database';
import type { ActionResponse } from './events';

/**
 * Derives a client identifier for rate limiting from request headers.
 */
async function getRateLimitIdentifier(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return headerList.get('x-real-ip') || 'client_unknown';
  } catch {
    return 'client_fallback';
  }
}

/**
 * Generates or retrieves an active reusable 8-character invite code for an event.
 */
export async function generateInviteCodeAction(
  eventId: string
): Promise<ActionResponse<{ invite: EventInvite; joinUrl: string }>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const invite = await EventsRepository.createInvite(userId, eventId);
    return {
      success: true,
      data: {
        invite,
        joinUrl: `/join/${invite.invite_code}`,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate invite.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

/**
 * Revokes an invite code (Owner only).
 */
export async function revokeInviteCodeAction(
  inviteCode: string
): Promise<ActionResponse<boolean>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    await EventsRepository.revokeInvite(userId, inviteCode);
    return { success: true, data: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to revoke invite.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

/**
 * Validates an invite code safely with rate-limiting.
 * Does not disclose event title, description, or members prior to authentication.
 */
export async function validateInviteCodeAction(
  inviteCode: string
): Promise<ActionResponse<{ valid: boolean }>> {
  try {
    const clientKey = await getRateLimitIdentifier();
    const result = await EventsRepository.validateInvite(clientKey, inviteCode);
    return { success: true, data: { valid: result.valid } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification failed.';
    return { success: false, error: message };
  }
}

/**
 * Allows a signed-in user to join an event using an invite code.
 */
export async function joinEventAction(
  inviteCode: string
): Promise<ActionResponse<{ eventId: string; alreadyMember: boolean }>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: 'Please sign in to accept this outing invitation.',
        code: 'UNAUTHORIZED',
      };
    }

    try {
      const user = await currentUser();
      await EventsRepository.upsertProfile({
        clerk_user_id: userId,
        first_name: user?.firstName || null,
        last_name: user?.lastName || null,
        image_url: user?.imageUrl || null,
      });
    } catch {
      await EventsRepository.upsertProfile({
        clerk_user_id: userId,
      });
    }

    const clientKey = await getRateLimitIdentifier();
    const result = await EventsRepository.joinEventWithCode(userId, inviteCode, clientKey);

    revalidatePath('/');
    revalidatePath(`/events/${result.eventId}`);

    return {
      success: true,
      data: {
        eventId: result.eventId,
        alreadyMember: result.alreadyMember,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to join event.';
    const code = (err as { code?: string })?.code || 'INVALID_INVITE';
    return { success: false, error: message, code };
  }
}
