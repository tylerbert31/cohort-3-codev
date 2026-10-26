import { describe, it, expect, beforeEach } from 'vitest';
import { EventsRepository } from '@/server/db/events-repository';
import { inviteRateLimiter } from '@/server/utils/rate-limiter';

describe('Feature — Item Edit Popup & Deadline (Mobile & Desktop)', () => {
  const OWNER_ID = 'user_clerk_owner_edit';
  const PARTICIPANT_ID = 'user_clerk_member_edit';
  const STRANGER_ID = 'user_clerk_stranger_edit';

  let eventId: string;

  beforeEach(async () => {
    EventsRepository.resetMemoryStore();
    inviteRateLimiter.reset('ip_test_edit');

    // Create an event
    const { event } = await EventsRepository.createEvent(OWNER_ID, {
      title: 'Yosemite Backcountry Expedition',
      location: 'Tuolumne Meadows',
    });
    eventId = event.id;

    // Join participant
    const invite = await EventsRepository.createInvite(OWNER_ID, eventId);
    await EventsRepository.joinEventWithCode(PARTICIPANT_ID, invite.invite_code, 'ip_test_edit');
  });

  describe('Item Creation & Modification with Deadline', () => {
    it('creates an item with an optional deadline', async () => {
      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'Bear Canister',
        deadline: '2026-10-30',
        quantity: '1 canister',
      });

      expect(item.id).toBeDefined();
      expect(item.title).toBe('Bear Canister');
      expect(item.deadline).toBe('2026-10-30');
    });

    it('modifies an existing item title, deadline, and assignee via updateItem', async () => {
      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'Initial Stove',
      });
      expect(item.deadline).toBeNull();
      expect(item.assignee_id).toBeNull();

      // Update name, deadline, and assignee
      const updated = await EventsRepository.updateItem(OWNER_ID, eventId, item.id, {
        title: 'Jetboil Flash Camp Stove',
        deadline: '2026-10-28',
        assignee_id: PARTICIPANT_ID,
        quantity: '2 canisters included',
      });

      expect(updated.title).toBe('Jetboil Flash Camp Stove');
      expect(updated.deadline).toBe('2026-10-28');
      expect(updated.assignee_id).toBe(PARTICIPANT_ID);
      expect(updated.quantity).toBe('2 canisters included');

      // Verify persistence via getEvent
      const details = await EventsRepository.getEvent(PARTICIPANT_ID, eventId);
      const persisted = details.unsectionedItems.find((i) => i.id === item.id);
      expect(persisted).toBeDefined();
      expect(persisted?.title).toBe('Jetboil Flash Camp Stove');
      expect(persisted?.deadline).toBe('2026-10-28');
      expect(persisted?.assignee_id).toBe(PARTICIPANT_ID);
    });

    it('clears an existing deadline when deadline is updated to null', async () => {
      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'Water Filter',
        deadline: '2026-11-01',
      });
      expect(item.deadline).toBe('2026-11-01');

      const updated = await EventsRepository.updateItem(OWNER_ID, eventId, item.id, {
        deadline: null,
      });

      expect(updated.deadline).toBeNull();
    });

    it('allows reassigning an item back to unassigned (null)', async () => {
      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'First Aid Kit',
        assignee_id: PARTICIPANT_ID,
      });
      expect(item.assignee_id).toBe(PARTICIPANT_ID);

      const updated = await EventsRepository.updateItem(OWNER_ID, eventId, item.id, {
        assignee_id: null,
      });
      expect(updated.assignee_id).toBeNull();
    });

    it('rejects assigning an item to a non-member', async () => {
      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'Satellite Communicator',
      });

      await expect(
        EventsRepository.updateItem(OWNER_ID, eventId, item.id, {
          assignee_id: STRANGER_ID,
        })
      ).rejects.toThrow('Assignee must be a member of this outing.');
    });

    it('rejects item modification by a non-member', async () => {
      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'Topographic Map',
      });

      await expect(
        EventsRepository.updateItem(STRANGER_ID, eventId, item.id, {
          title: 'Hacked Map',
        })
      ).rejects.toThrow();
    });

    it('rejects item updates when the outing is completed and locked', async () => {
      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'Headlamp',
      });

      // Complete outing
      await EventsRepository.completeEvent(OWNER_ID, eventId);

      await expect(
        EventsRepository.updateItem(OWNER_ID, eventId, item.id, {
          title: 'Modified Headlamp',
          deadline: '2026-11-05',
        })
      ).rejects.toThrow('This event is completed and permanently locked against mutations.');
    });
  });
  describe('Minimum Current Date UI Restriction', () => {
    it('enforces min current date attribute on item deadline input and blocks past dates', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const viewCode = fs.readFileSync(
        path.resolve(__dirname, '../src/app/events/[id]/event-view.tsx'),
        'utf-8'
      );

      // Verify min attribute on item-deadline-input
      expect(viewCode).toContain('id="item-deadline-input"');
      expect(viewCode).toContain('min={todayDateString}');

      // Verify validation check against past dates
      expect(viewCode).toContain('Deadline cannot be in the past.');
    });
  });
});
