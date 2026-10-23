import { describe, it, expect } from 'vitest';
import {
  assertEventNotCompleted,
  assertEventMembership,
  assertEventOwner,
  validateInviteCode,
  sanitizeProfileSync,
  AuthorizationError,
} from '@/server/auth/authorization';
import type { MemberRole } from '@/types/database';

describe('Phase 02 — Data Model & Authorization Security Invariants', () => {
  describe('1. Permanent Completed-Event Lock Invariant', () => {
    it('allows mutation attempts on active events', () => {
      expect(() => assertEventNotCompleted('active')).not.toThrow();
    });

    it('allows mutation attempts on archived events if allowed by lifecycle', () => {
      expect(() => assertEventNotCompleted('archived')).not.toThrow();
    });

    it('strictly throws EVENT_LOCKED on completed events', () => {
      expect(() => assertEventNotCompleted('completed')).toThrowError(
        'This event is completed and permanently locked against mutations.'
      );
      try {
        assertEventNotCompleted('completed');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthorizationError);
        expect((err as AuthorizationError).code).toBe('EVENT_LOCKED');
      }
    });
  });

  describe('2. Event Membership & Cross-User Isolation', () => {
    const mockMembers: { clerk_user_id: string; role: MemberRole }[] = [
      { clerk_user_id: 'user_owner_123', role: 'owner' },
      { clerk_user_id: 'user_participant_456', role: 'participant' },
    ];

    it('rejects unauthenticated requests with UNAUTHORIZED', () => {
      expect(() => assertEventMembership(null, mockMembers)).toThrowError(
        'Authentication required to access event.'
      );
      try {
        assertEventMembership(undefined, mockMembers);
      } catch (err) {
        expect((err as AuthorizationError).code).toBe('UNAUTHORIZED');
      }
    });

    it('rejects non-members attempting cross-user event access with FORBIDDEN', () => {
      expect(() => assertEventMembership('user_intruder_999', mockMembers)).toThrowError(
        'You are not a participant in this event.'
      );
      try {
        assertEventMembership('user_intruder_999', mockMembers);
      } catch (err) {
        expect((err as AuthorizationError).code).toBe('FORBIDDEN');
      }
    });

    it('confirms access for valid event participants', () => {
      const member = assertEventMembership('user_participant_456', mockMembers);
      expect(member).toBeDefined();
      expect(member.role).toBe('participant');
    });

    it('confirms access for the event owner', () => {
      const member = assertEventMembership('user_owner_123', mockMembers);
      expect(member.role).toBe('owner');
    });
  });

  describe('3. Event Owner Role Enforcement', () => {
    it('enforces owner-only permissions on sensitive actions', () => {
      expect(() => assertEventOwner('user_owner_123', 'user_owner_123')).not.toThrow();
    });

    it('strictly forbids participants from owner operations', () => {
      expect(() =>
        assertEventOwner('user_participant_456', 'user_owner_123')
      ).toThrowError('Only the event owner can perform this action.');
    });
  });

  describe('4. Invite Code Safe Validation', () => {
    const mockInvites = [
      {
        invite_code: 'SIERRA26',
        is_active: true,
        revoked_at: null,
        event_id: 'event-uuid-1',
      },
      {
        invite_code: 'REVOKED9',
        is_active: false,
        revoked_at: '2026-10-20T12:00:00Z',
        event_id: 'event-uuid-2',
      },
    ];

    it('validates active invite codes regardless of input casing', () => {
      const result = validateInviteCode('sierra26', mockInvites);
      expect(result.event_id).toBe('event-uuid-1');
    });

    it('rejects revoked or inactive invite codes safely', () => {
      expect(() => validateInviteCode('REVOKED9', mockInvites)).toThrowError(
        'Invalid or expired invite code.'
      );
      try {
        validateInviteCode('REVOKED9', mockInvites);
      } catch (err) {
        expect((err as AuthorizationError).code).toBe('INVALID_INVITE');
      }
    });

    it('rejects non-existent codes with generic error to prevent enumeration', () => {
      expect(() => validateInviteCode('RANDOM99', mockInvites)).toThrowError(
        'Invalid or expired invite code.'
      );
    });
  });

  describe('5. Clerk Profile Synchronization Idempotency', () => {
    it('sanitizes and trims profile fields', () => {
      const result = sanitizeProfileSync({
        clerk_user_id: 'user_2xyz',
        first_name: '  Alex  ',
        last_name: '  Rivera ',
        image_url: ' https://img.clerk.com/avatar.jpg ',
      });

      expect(result).toEqual({
        clerk_user_id: 'user_2xyz',
        first_name: 'Alex',
        last_name: 'Rivera',
        image_url: 'https://img.clerk.com/avatar.jpg',
      });
    });

    it('handles missing or null first/last names cleanly without throwing', () => {
      const result = sanitizeProfileSync({
        clerk_user_id: 'user_3abc',
        first_name: null,
        last_name: undefined,
        image_url: null,
      });

      expect(result.clerk_user_id).toBe('user_3abc');
      expect(result.first_name).toBeNull();
      expect(result.last_name).toBeNull();
      expect(result.image_url).toBeNull();
    });

    it('strictly requires a valid clerk_user_id', () => {
      expect(() =>
        sanitizeProfileSync({ clerk_user_id: '' })
      ).toThrowError('Valid clerk_user_id is required for profile sync.');
    });
  });
});
