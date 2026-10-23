import type { EventStatus, MemberRole } from '@/types/database';

export class AuthorizationError extends Error {
  constructor(message: string, public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'EVENT_LOCKED' | 'INVALID_INVITE') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Asserts that an event is not in terminal completed state.
 * Completed events are permanently locked against any modifications.
 */
export function assertEventNotCompleted(eventStatus: EventStatus): void {
  if (eventStatus === 'completed') {
    throw new AuthorizationError(
      'This event is completed and permanently locked against mutations.',
      'EVENT_LOCKED'
    );
  }
}

/**
 * Validates that a user is an authorized member of an event.
 */
export function assertEventMembership(
  userId: string | null | undefined,
  members: { clerk_user_id: string; role: MemberRole }[]
): { clerk_user_id: string; role: MemberRole } {
  if (!userId) {
    throw new AuthorizationError('Authentication required to access event.', 'UNAUTHORIZED');
  }

  const member = members.find((m) => m.clerk_user_id === userId);
  if (!member) {
    throw new AuthorizationError('You are not a participant in this event.', 'FORBIDDEN');
  }

  return member;
}

/**
 * Enforces owner-only permissions for sensitive event operations (e.g. archive, complete, invite revocation).
 */
export function assertEventOwner(
  userId: string | null | undefined,
  ownerId: string
): void {
  if (!userId) {
    throw new AuthorizationError('Authentication required.', 'UNAUTHORIZED');
  }
  if (userId !== ownerId) {
    throw new AuthorizationError('Only the event owner can perform this action.', 'FORBIDDEN');
  }
}

/**
 * Validates invite code safely without exposing event existence.
 */
export function validateInviteCode(
  code: string,
  invites: { invite_code: string; is_active: boolean; revoked_at: string | null; event_id: string }[]
): { event_id: string } {
  const normalizedCode = code.trim().toUpperCase();
  const invite = invites.find(
    (inv) => inv.invite_code === normalizedCode && inv.is_active && !inv.revoked_at
  );

  if (!invite) {
    throw new AuthorizationError('Invalid or expired invite code.', 'INVALID_INVITE');
  }

  return { event_id: invite.event_id };
}

/**
 * Sanitizes and formats Clerk profile data for idempotent database upsert.
 */
export function sanitizeProfileSync(data: {
  clerk_user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
}) {
  if (!data.clerk_user_id || typeof data.clerk_user_id !== 'string') {
    throw new Error('Valid clerk_user_id is required for profile sync.');
  }

  return {
    clerk_user_id: data.clerk_user_id,
    first_name: data.first_name?.trim() || null,
    last_name: data.last_name?.trim() || null,
    image_url: data.image_url?.trim() || null,
  };
}
