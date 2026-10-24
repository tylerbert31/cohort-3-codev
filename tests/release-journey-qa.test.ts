import { describe, it, expect, beforeEach } from 'vitest';
import { EventsRepository } from '@/server/db/events-repository';
import { inviteRateLimiter } from '@/server/utils/rate-limiter';
import { sanitizeProfileSync } from '@/server/auth/authorization';

describe('Phase 06 — End-to-End Release & Journey QA Suite', () => {
  const ORGANIZER_ID = 'user_clerk_organizer_alex';
  const COLLABORATOR_ID = 'user_clerk_collaborator_sam';
  const OUTSIDER_ID = 'user_clerk_outsider_jordan';

  beforeEach(() => {
    EventsRepository.resetMemoryStore();
    inviteRateLimiter.reset('qa_client_ip');
  });

  describe('Journey 1: Profile Synchronization & User Identity', () => {
    it('sanitizes and upserts Google OAuth profile attributes idempotently', async () => {
      const sanitized = sanitizeProfileSync({
        clerk_user_id: ORGANIZER_ID,
        first_name: 'Alex',
        last_name: 'Rivera',
        image_url: 'https://img.clerk.com/alex.png',
      });

      const profile = await EventsRepository.upsertProfile(sanitized);
      expect(profile.clerk_user_id).toBe(ORGANIZER_ID);
      expect(profile.first_name).toBe('Alex');
      expect(profile.last_name).toBe('Rivera');

      // Idempotent update (e.g. avatar change)
      const updatedProfile = await EventsRepository.upsertProfile({
        clerk_user_id: ORGANIZER_ID,
        image_url: 'https://img.clerk.com/alex_new.png',
      });

      expect(updatedProfile.first_name).toBe('Alex');
      expect(updatedProfile.image_url).toBe('https://img.clerk.com/alex_new.png');
    });
  });

  describe('Journey 2: Outing Creation & Dashboard Presence', () => {
    it('creates outing with atomic owner membership and displays under Active list', async () => {
      const { event, ownerMember } = await EventsRepository.createEvent(ORGANIZER_ID, {
        title: 'Cascade Pass Mountaineering',
        location: 'North Cascades, WA',
        start_date: '2026-09-01',
        end_date: '2026-09-04',
        description: '4-day alpine expedition over Cascade Pass and Sahale Arm.',
      });

      expect(event.id).toBeDefined();
      expect(event.status).toBe('active');
      expect(ownerMember.role).toBe('owner');
      expect(ownerMember.clerk_user_id).toBe(ORGANIZER_ID);

      // Verify listing for organizer
      const list = await EventsRepository.listEventsForUser(ORGANIZER_ID);
      expect(list.active).toHaveLength(1);
      expect(list.active[0].id).toBe(event.id);
      expect(list.completed).toHaveLength(0);
      expect(list.archived).toHaveLength(0);
    });
  });

  describe('Journey 3: Secure Invitation Onboarding & Participant Joining', () => {
    it('generates 8-character invite code and onboards collaborator safely', async () => {
      const { event } = await EventsRepository.createEvent(ORGANIZER_ID, {
        title: 'Olympic Rain Forest Trek',
      });

      const invite = await EventsRepository.createInvite(ORGANIZER_ID, event.id);
      expect(invite.invite_code).toHaveLength(8);
      expect(invite.invite_code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);

      // Collaborator joins
      const joinResult = await EventsRepository.joinEventWithCode(
        COLLABORATOR_ID,
        invite.invite_code,
        'qa_client_ip'
      );
      expect(joinResult.success).toBe(true);
      expect(joinResult.alreadyMember).toBe(false);

      // Duplicate join attempt is handled idempotently
      const dupJoin = await EventsRepository.joinEventWithCode(
        COLLABORATOR_ID,
        invite.invite_code,
        'qa_client_ip'
      );
      expect(dupJoin.success).toBe(true);
      expect(dupJoin.alreadyMember).toBe(true);

      // Both members are listed with correct roles
      const details = await EventsRepository.getEvent(ORGANIZER_ID, event.id);
      expect(details.members).toHaveLength(2);
      expect(details.members.find((m) => m.clerk_user_id === ORGANIZER_ID)?.role).toBe('owner');
      expect(details.members.find((m) => m.clerk_user_id === COLLABORATOR_ID)?.role).toBe('participant');
    });

    it('rejects invalid or revoked invite codes safely without leaking private event data', async () => {
      const { event } = await EventsRepository.createEvent(ORGANIZER_ID, {
        title: 'Secret Alpine Spot',
      });

      const invite = await EventsRepository.createInvite(ORGANIZER_ID, event.id);
      await EventsRepository.revokeInvite(ORGANIZER_ID, invite.invite_code);

      await expect(
        EventsRepository.joinEventWithCode(OUTSIDER_ID, invite.invite_code, 'qa_client_ip')
      ).rejects.toThrowError('Invalid or expired invite code.');

      await expect(
        EventsRepository.joinEventWithCode(OUTSIDER_ID, 'NONEXISTENT', 'qa_client_ip')
      ).rejects.toThrowError('Invalid or expired invite code.');
    });
  });

  describe('Journey 4: Cross-Tenant Isolation & Access Control', () => {
    it('strictly denies unauthorized users from viewing private outing details', async () => {
      const { event } = await EventsRepository.createEvent(ORGANIZER_ID, {
        title: 'Private Family Gathering',
      });

      await expect(
        EventsRepository.getEvent(OUTSIDER_ID, event.id)
      ).rejects.toThrowError('You are not a participant in this event.');
    });
  });

  describe('Journey 5: Collaborative Checklist, Assignment & Realtime Milestones', () => {
    it('allows collaborative section/item management with participant-only assignment', async () => {
      const { event } = await EventsRepository.createEvent(ORGANIZER_ID, {
        title: 'Zion Narrows Backpacking',
      });
      const invite = await EventsRepository.createInvite(ORGANIZER_ID, event.id);
      await EventsRepository.joinEventWithCode(COLLABORATOR_ID, invite.invite_code, 'qa_client_ip');

      // Collaborator creates section
      const section = await EventsRepository.createSection(COLLABORATOR_ID, event.id, {
        title: 'Water & Filtration',
      });

      // Collaborator creates item assigned to organizer
      const item = await EventsRepository.createItem(COLLABORATOR_ID, event.id, {
        section_id: section.id,
        title: 'Gravity Water Filter',
        quantity: '4L capacity',
        notes: 'Includes spare hollow fiber cartridge',
        assignee_id: ORGANIZER_ID,
      });

      expect(item.assignee_id).toBe(ORGANIZER_ID);
      expect(item.is_completed).toBe(false);

      // Attempt assigning to outsider fails
      await expect(
        EventsRepository.createItem(COLLABORATOR_ID, event.id, {
          section_id: section.id,
          title: 'Emergency Beacon',
          assignee_id: OUTSIDER_ID,
        })
      ).rejects.toThrowError('Assignee must be a member of this outing.');

      // Toggle item completion
      const completed = await EventsRepository.toggleItemCompletion(
        ORGANIZER_ID,
        event.id,
        item.id,
        true
      );
      expect(completed.is_completed).toBe(true);
      expect(completed.completed_by).toBe(ORGANIZER_ID);

      // Check activity log contains all milestone events
      const details = await EventsRepository.getEvent(ORGANIZER_ID, event.id);
      const activityTypes = details.activities.map((a) => a.event_type);
      expect(activityTypes).toContain('event_created');
      expect(activityTypes).toContain('member_joined');
      expect(activityTypes).toContain('section_created');
      expect(activityTypes).toContain('item_created');
      expect(activityTypes).toContain('item_completed');
    });
  });

  describe('Journey 6: Personal Templates Reuse & Clean Copy Invariant', () => {
    it('extracts template from trip and applies cleanly to a new trip without data corruption', async () => {
      const { event: trip1 } = await EventsRepository.createEvent(ORGANIZER_ID, {
        title: 'Sierra Nevada Summer Camp',
      });
      const sec1 = await EventsRepository.createSection(ORGANIZER_ID, trip1.id, { title: 'Camp Kitchen' });
      await EventsRepository.createItem(ORGANIZER_ID, trip1.id, {
        section_id: sec1.id,
        title: '2-Burner Propane Stove',
        quantity: '1',
      });

      // Save as template
      const template = await EventsRepository.saveTemplateFromEvent(ORGANIZER_ID, trip1.id, {
        templateName: 'Master Camp Kitchen Template',
      });

      expect(template.name).toBe('Master Camp Kitchen Template');

      // Create new trip and apply template
      const { event: trip2 } = await EventsRepository.createEvent(ORGANIZER_ID, {
        title: 'Joshua Tree Autumn Camp',
      });
      const applyResult = await EventsRepository.applyTemplateToEvent(ORGANIZER_ID, trip2.id, template.id);

      expect(applyResult.addedSectionsCount).toBe(1);
      expect(applyResult.addedItemsCount).toBe(1);

      const trip2Details = await EventsRepository.getEvent(ORGANIZER_ID, trip2.id);
      expect(trip2Details.sections).toHaveLength(1);
      expect(trip2Details.sections[0].title).toBe('Camp Kitchen');
      expect(trip2Details.sections[0].items[0].title).toBe('2-Burner Propane Stove');
    });
  });

  describe('Journey 7: Event Lifecycle, Archive, Restore & Permanent Lock', () => {
    it('completes trip and enforces terminal read-only lock across all operations', async () => {
      const { event } = await EventsRepository.createEvent(ORGANIZER_ID, {
        title: 'Denali Basecamp Trek',
      });
      const sec = await EventsRepository.createSection(ORGANIZER_ID, event.id, { title: 'Glacier Gear' });
      const item = await EventsRepository.createItem(ORGANIZER_ID, event.id, {
        section_id: sec.id,
        title: 'Steel Crampons',
      });

      // Archive & Restore
      const archived = await EventsRepository.archiveEvent(ORGANIZER_ID, event.id);
      expect(archived.status).toBe('archived');

      const restored = await EventsRepository.restoreEvent(ORGANIZER_ID, event.id);
      expect(restored.status).toBe('active');

      // Complete trip permanently
      const completed = await EventsRepository.completeEvent(ORGANIZER_ID, event.id);
      expect(completed.status).toBe('completed');
      expect(completed.completed_at).toBeDefined();

      // Mutation rejections on completed trip
      await expect(
        EventsRepository.archiveEvent(ORGANIZER_ID, event.id)
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');

      await expect(
        EventsRepository.restoreEvent(ORGANIZER_ID, event.id)
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');

      await expect(
        EventsRepository.createSection(ORGANIZER_ID, event.id, { title: 'Post-Trip Items' })
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');

      await expect(
        EventsRepository.createItem(ORGANIZER_ID, event.id, { section_id: sec.id, title: 'Extra Fuel' })
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');

      await expect(
        EventsRepository.toggleItemCompletion(ORGANIZER_ID, event.id, item.id, true)
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');

      await expect(
        EventsRepository.deleteItem(ORGANIZER_ID, event.id, item.id)
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');
    });
  });
});
