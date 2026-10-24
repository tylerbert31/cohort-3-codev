import { describe, it, expect, beforeEach } from 'vitest';
import { EventsRepository } from '@/server/db/events-repository';
import { inviteRateLimiter } from '@/server/utils/rate-limiter';

describe('Feature — Remove Category in Events', () => {
  const OWNER_ID = 'user_clerk_owner_del_cat';
  const PARTICIPANT_ID = 'user_clerk_member_del_cat';
  const STRANGER_ID = 'user_clerk_stranger_del_cat';

  let eventId: string;

  beforeEach(async () => {
    EventsRepository.resetMemoryStore();
    inviteRateLimiter.reset('ip_test_del_cat');

    // Create an event
    const { event } = await EventsRepository.createEvent(OWNER_ID, {
      title: 'Grand Canyon Expedition',
      location: 'South Rim, AZ',
    });
    eventId = event.id;

    // Join participant
    const invite = await EventsRepository.createInvite(OWNER_ID, eventId);
    await EventsRepository.joinEventWithCode(PARTICIPANT_ID, invite.invite_code, 'ip_test_del_cat');
  });

  describe('Category Deletion Scenarios', () => {
    it('deletes an empty category cleanly', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Empty Camp Category',
      });

      let details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.sections).toHaveLength(1);

      await EventsRepository.deleteSection(OWNER_ID, eventId, section.id);

      details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.sections).toHaveLength(0);
    });

    it('removes category and preserves items by moving them to unsectioned when keepItems is true', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Camp Lighting',
      });

      const item1 = await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section.id,
        title: 'Headlamp 350lm',
        quantity: '2 units',
      });
      const item2 = await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section.id,
        title: 'Camp Lantern',
        quantity: '1 unit',
      });

      let details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.sections).toHaveLength(1);
      expect(details.sections[0].items).toHaveLength(2);
      expect(details.unsectionedItems).toHaveLength(0);

      // Remove category with keepItems: true
      await EventsRepository.deleteSection(OWNER_ID, eventId, section.id, { keepItems: true });

      details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.sections).toHaveLength(0);
      expect(details.unsectionedItems).toHaveLength(2);

      const unsecTitles = details.unsectionedItems.map((i) => i.title);
      expect(unsecTitles).toContain('Headlamp 350lm');
      expect(unsecTitles).toContain('Camp Lantern');

      // Verify section_id is now null
      const movedItem1 = details.unsectionedItems.find((i) => i.id === item1.id);
      expect(movedItem1?.section_id).toBeNull();
      const movedItem2 = details.unsectionedItems.find((i) => i.id === item2.id);
      expect(movedItem2?.section_id).toBeNull();
    });

    it('removes category and permanently deletes its items when keepItems is false', async () => {
      // Create two sections
      const section1 = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Cooking Gear',
      });
      const section2 = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Sleep Systems',
      });

      await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section1.id,
        title: 'Stove Fuel',
      });
      await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section2.id,
        title: 'Down Sleeping Bag',
      });

      // Also create an existing unsectioned item
      await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: null,
        title: 'National Parks Pass',
      });

      // Remove Cooking Gear and delete its items
      await EventsRepository.deleteSection(OWNER_ID, eventId, section1.id, { keepItems: false });

      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.sections).toHaveLength(1);
      expect(details.sections[0].title).toBe('Sleep Systems');
      expect(details.sections[0].items).toHaveLength(1);
      expect(details.unsectionedItems).toHaveLength(1);
      expect(details.unsectionedItems[0].title).toBe('National Parks Pass');
    });

    it('allows a joined participant to delete a category', async () => {
      const section = await EventsRepository.createSection(PARTICIPANT_ID, eventId, {
        title: 'Shared Navigation Tools',
      });

      await EventsRepository.deleteSection(PARTICIPANT_ID, eventId, section.id);

      const details = await EventsRepository.getEvent(PARTICIPANT_ID, eventId);
      expect(details.sections).toHaveLength(0);
    });

    it('rejects category deletion by a stranger (non-member)', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Secure Section',
      });

      await expect(
        EventsRepository.deleteSection(STRANGER_ID, eventId, section.id)
      ).rejects.toThrow();
    });

    it('rejects category deletion when the outing is completed and locked', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Locked Section',
      });

      await EventsRepository.completeEvent(OWNER_ID, eventId);

      await expect(
        EventsRepository.deleteSection(OWNER_ID, eventId, section.id)
      ).rejects.toThrow('This event is completed and permanently locked against mutations.');
    });
  });
});
