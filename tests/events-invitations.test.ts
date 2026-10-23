import { describe, it, expect, beforeEach } from 'vitest';
import { EventsRepository, generateSecureInviteCode } from '@/server/db/events-repository';
import { inviteRateLimiter } from '@/server/utils/rate-limiter';
import { AuthorizationError } from '@/server/auth/authorization';

describe('Phase 04 — Events & Invitations Integration & Security Suite', () => {
  const OWNER_ID = 'user_owner_sierra_1';
  const PARTICIPANT_ID = 'user_participant_tahoe_2';
  const STRANGER_ID = 'user_stranger_intruder_9';

  beforeEach(() => {
    EventsRepository.resetMemoryStore();
    inviteRateLimiter.reset('test_client_ip');
  });

  describe('1. Event Creation & Atomic Membership', () => {
    it('rejects unauthenticated requests with UNAUTHORIZED', async () => {
      await expect(
        EventsRepository.createEvent('', { title: 'Yosemite Trip' })
      ).rejects.toThrowError(AuthorizationError);
    });

    it('rejects invalid title (empty or exceeds 100 characters)', async () => {
      await expect(
        EventsRepository.createEvent(OWNER_ID, { title: '   ' })
      ).rejects.toThrowError('Title is required and must not exceed 100 characters.');

      const superLongTitle = 'A'.repeat(101);
      await expect(
        EventsRepository.createEvent(OWNER_ID, { title: superLongTitle })
      ).rejects.toThrowError('Title is required and must not exceed 100 characters.');
    });

    it('atomically creates event, owner membership, and initial activity event', async () => {
      const { event, ownerMember } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Tuolumne Meadows Camping',
        description: 'Weekend backpacking and stargazing',
        location: 'Yosemite National Park',
        start_date: '2026-08-15',
        end_date: '2026-08-17',
      });

      expect(event.id).toBeDefined();
      expect(event.title).toBe('Tuolumne Meadows Camping');
      expect(event.status).toBe('active');
      expect(event.owner_id).toBe(OWNER_ID);

      // Verify owner membership
      expect(ownerMember.event_id).toBe(event.id);
      expect(ownerMember.clerk_user_id).toBe(OWNER_ID);
      expect(ownerMember.role).toBe('owner');

      // Verify event details query
      const details = await EventsRepository.getEvent(OWNER_ID, event.id);
      expect(details.event.id).toBe(event.id);
      expect(details.userRole).toBe('owner');
      expect(details.members).toHaveLength(1);
      expect(details.members[0].role).toBe('owner');

      // Verify initial activity log
      expect(details.activities).toHaveLength(1);
      expect(details.activities[0].event_type).toBe('event_created');
      expect(details.activities[0].actor_id).toBe(OWNER_ID);
    });
  });

  describe('2. Server-Side Membership Authorization & Cross-Tenant Isolation', () => {
    it('strictly denies non-members from viewing event details with FORBIDDEN', async () => {
      const { event } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Private Family Retreat',
      });

      await expect(
        EventsRepository.getEvent(STRANGER_ID, event.id)
      ).rejects.toThrowError('You are not a participant in this event.');

      try {
        await EventsRepository.getEvent(STRANGER_ID, event.id);
      } catch (err) {
        expect(err).toBeInstanceOf(AuthorizationError);
        expect((err as AuthorizationError).code).toBe('FORBIDDEN');
      }
    });

    it('requires authentication to view event details', async () => {
      const { event } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Summit Trail Hike',
      });

      await expect(EventsRepository.getEvent(null, event.id)).rejects.toThrowError(
        'Authentication required to view event.'
      );
    });
  });

  describe('3. Event Lifecycle: Archive, Restore, and Permanent Lock', () => {
    it('allows owner to archive and restore an active event', async () => {
      const { event } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Kings Canyon Expedition',
      });

      // Archive
      const archived = await EventsRepository.archiveEvent(OWNER_ID, event.id);
      expect(archived.status).toBe('archived');
      expect(archived.archived_at).toBeDefined();

      // Verify listed under archived
      const listAfterArchive = await EventsRepository.listEventsForUser(OWNER_ID);
      expect(listAfterArchive.active).toHaveLength(0);
      expect(listAfterArchive.archived).toHaveLength(1);
      expect(listAfterArchive.archived[0].id).toBe(event.id);

      // Restore
      const restored = await EventsRepository.restoreEvent(OWNER_ID, event.id);
      expect(restored.status).toBe('active');
      expect(restored.archived_at).toBeNull();

      const listAfterRestore = await EventsRepository.listEventsForUser(OWNER_ID);
      expect(listAfterRestore.active).toHaveLength(1);
      expect(listAfterRestore.archived).toHaveLength(0);
    });

    it('strictly forbids non-owner from archiving or restoring', async () => {
      const { event } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Glacier Point Sunset',
      });

      // Non-member or non-owner cannot archive
      await expect(
        EventsRepository.archiveEvent(PARTICIPANT_ID, event.id)
      ).rejects.toThrowError('Only the event owner can perform this action.');
    });

    it('permanently locks completed events against archive or restore', async () => {
      const { event } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Half Dome Ascent',
      });

      // Complete event
      const completed = await EventsRepository.completeEvent(OWNER_ID, event.id);
      expect(completed.status).toBe('completed');
      expect(completed.completed_at).toBeDefined();

      // Attempt archive on completed event -> rejected
      await expect(
        EventsRepository.archiveEvent(OWNER_ID, event.id)
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');

      // Attempt restore on completed event -> rejected
      await expect(
        EventsRepository.restoreEvent(OWNER_ID, event.id)
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');
    });
  });

  describe('4. Secure Invite Codes & Rate-Limited Join Flow', () => {
    it('generates high-entropy 8-character codes without ambiguous characters', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateSecureInviteCode();
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
        // Ensure no confusing 0, O, 1, I characters
        expect(code).not.toMatch(/[01IO]/);
      }
    });

    it('reuses active invite code for the same event idempotently', async () => {
      const { event } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Desolation Wilderness Trek',
      });

      const invite1 = await EventsRepository.createInvite(OWNER_ID, event.id);
      const invite2 = await EventsRepository.createInvite(OWNER_ID, event.id);

      expect(invite1.invite_code).toBe(invite2.invite_code);
    });

    it('allows a participant to join an active event with a valid code', async () => {
      const { event } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Mammoth Lakes Fishing',
      });

      const invite = await EventsRepository.createInvite(OWNER_ID, event.id);

      const joinResult = await EventsRepository.joinEventWithCode(
        PARTICIPANT_ID,
        invite.invite_code,
        'test_client_ip'
      );

      expect(joinResult.success).toBe(true);
      expect(joinResult.eventId).toBe(event.id);
      expect(joinResult.alreadyMember).toBe(false);

      // Verify participant now has authorized access
      const details = await EventsRepository.getEvent(PARTICIPANT_ID, event.id);
      expect(details.userRole).toBe('participant');
      expect(details.members).toHaveLength(2);

      // Verify member_joined activity recorded
      const joinedActivity = details.activities.find((a) => a.event_type === 'member_joined');
      expect(joinedActivity).toBeDefined();
      expect(joinedActivity?.actor_id).toBe(PARTICIPANT_ID);
    });

    it('handles duplicate join attempts idempotently without creating duplicate memberships', async () => {
      const { event } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Lake Tahoe Kayaking',
      });

      const invite = await EventsRepository.createInvite(OWNER_ID, event.id);

      // First join
      await EventsRepository.joinEventWithCode(PARTICIPANT_ID, invite.invite_code, 'test_client_ip');

      // Second join with same user and code
      const secondJoin = await EventsRepository.joinEventWithCode(
        PARTICIPANT_ID,
        invite.invite_code,
        'test_client_ip'
      );

      expect(secondJoin.success).toBe(true);
      expect(secondJoin.alreadyMember).toBe(true);

      const details = await EventsRepository.getEvent(PARTICIPANT_ID, event.id);
      const participantCount = details.members.filter(
        (m) => m.clerk_user_id === PARTICIPANT_ID
      ).length;
      expect(participantCount).toBe(1);
    });

    it('rejects revoked or non-existent invite codes safely without leaking event data', async () => {
      const { event } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Hidden Valley Camp',
      });

      const invite = await EventsRepository.createInvite(OWNER_ID, event.id);

      // Revoke the invite
      await EventsRepository.revokeInvite(OWNER_ID, invite.invite_code);

      // Attempt join with revoked code
      await expect(
        EventsRepository.joinEventWithCode(STRANGER_ID, invite.invite_code, 'test_client_ip')
      ).rejects.toThrowError('Invalid or expired invite code.');

      // Attempt join with completely non-existent code
      await expect(
        EventsRepository.joinEventWithCode(STRANGER_ID, 'FAKE9999', 'test_client_ip')
      ).rejects.toThrowError('Invalid or expired invite code.');
    });

    it('enforces rate limiting on repeated failed attempts', async () => {
      const ip = 'abusive_client_ip';

      // 10 attempts allowed
      for (let i = 0; i < 10; i++) {
        const result = await EventsRepository.validateInvite(ip, 'INVALID_CODE');
        expect(result.valid).toBe(false);
      }

      // 11th attempt should trigger rate limit rejection
      await expect(EventsRepository.validateInvite(ip, 'INVALID_CODE')).rejects.toThrowError(
        'Too many attempts. Please try again in 1 minute.'
      );
    });

    it('strictly forbids joining completed events', async () => {
      const { event } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Completed Expedition',
      });

      const invite = await EventsRepository.createInvite(OWNER_ID, event.id);
      await EventsRepository.completeEvent(OWNER_ID, event.id);

      // Attempt join on completed event
      await expect(
        EventsRepository.joinEventWithCode(STRANGER_ID, invite.invite_code, 'test_client_ip')
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');
    });
  });
});
