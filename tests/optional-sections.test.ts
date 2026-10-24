import { describe, it, expect, beforeEach } from 'vitest';
import { EventsRepository } from '@/server/db/events-repository';
import { inviteRateLimiter } from '@/server/utils/rate-limiter';

describe('Feature — Optional Event Sections & Direct Item Addition', () => {
  const OWNER_ID = 'user_clerk_owner_opt';
  const PARTICIPANT_ID = 'user_clerk_member_opt';
  const STRANGER_ID = 'user_clerk_stranger_opt';

  let eventId: string;

  beforeEach(async () => {
    EventsRepository.resetMemoryStore();
    inviteRateLimiter.reset('ip_test_opt');

    // Create an event with zero sections
    const { event } = await EventsRepository.createEvent(OWNER_ID, {
      title: 'Pinnacles Day Hike',
      location: 'Pinnacles National Park',
    });
    eventId = event.id;

    // Join participant
    const invite = await EventsRepository.createInvite(OWNER_ID, eventId);
    await EventsRepository.joinEventWithCode(PARTICIPANT_ID, invite.invite_code, 'ip_test_opt');
  });

  describe('Direct Item Creation without Sections', () => {
    it('allows adding items directly to an event when section_id is null', async () => {
      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: null,
        title: 'Sunscreen SPF 50',
        quantity: '1 bottle',
        notes: 'Broad spectrum',
      });

      expect(item.id).toBeDefined();
      expect(item.section_id).toBeNull();
      expect(item.title).toBe('Sunscreen SPF 50');

      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.sections).toHaveLength(0);
      expect(details.unsectionedItems).toHaveLength(1);
      expect(details.unsectionedItems[0].title).toBe('Sunscreen SPF 50');
      expect(details.unsectionedItems[0].quantity).toBe('1 bottle');
    });

    it('allows participant to add items directly without sections', async () => {
      const item = await EventsRepository.createItem(PARTICIPANT_ID, eventId, {
        title: 'Trail Mix & Electrolytes',
        quantity: '500g',
      });

      expect(item.id).toBeDefined();
      expect(item.section_id).toBeNull();

      const details = await EventsRepository.getEvent(PARTICIPANT_ID, eventId);
      expect(details.unsectionedItems).toHaveLength(1);
      expect(details.unsectionedItems[0].title).toBe('Trail Mix & Electrolytes');
    });

    it('blocks non-members from adding direct items', async () => {
      await expect(
        EventsRepository.createItem(STRANGER_ID, eventId, {
          title: 'Unwelcome Item',
        })
      ).rejects.toThrowError('not a participant in this event');
    });

    it('supports toggling, updating, and deleting direct items', async () => {
      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'Headlamp',
        quantity: '1 unit',
      });

      // Toggle completion
      const completedItem = await EventsRepository.toggleItemCompletion(
        OWNER_ID,
        eventId,
        item.id,
        true
      );
      expect(completedItem.is_completed).toBe(true);
      expect(completedItem.completed_by).toBe(OWNER_ID);

      let details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.unsectionedItems[0].is_completed).toBe(true);

      // Update notes
      const updated = await EventsRepository.updateItem(OWNER_ID, eventId, item.id, {
        notes: 'Includes spare AAA batteries',
      });
      expect(updated.notes).toBe('Includes spare AAA batteries');

      // Delete item
      await EventsRepository.deleteItem(OWNER_ID, eventId, item.id);
      details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.unsectionedItems).toHaveLength(0);
    });
  });

  describe('Hybrid: Direct Items alongside Categorized Sections', () => {
    it('supports an event having both direct items and categorized sections simultaneously', async () => {
      // Direct item 1
      await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'National Park Pass',
      });

      // Create a section
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Navigation Gear',
      });

      // Item in section
      await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section.id,
        title: 'Topographic Map',
      });

      // Direct item 2
      await EventsRepository.createItem(PARTICIPANT_ID, eventId, {
        title: 'Emergency Whistle',
      });

      const details = await EventsRepository.getEvent(OWNER_ID, eventId);

      // Verify sections
      expect(details.sections).toHaveLength(1);
      expect(details.sections[0].title).toBe('Navigation Gear');
      expect(details.sections[0].items).toHaveLength(1);
      expect(details.sections[0].items[0].title).toBe('Topographic Map');

      // Verify unsectioned items
      expect(details.unsectionedItems).toHaveLength(2);
      expect(details.unsectionedItems.map((i) => i.title)).toEqual([
        'National Park Pass',
        'Emergency Whistle',
      ]);
    });

    it('deleting a section preserves unsectioned items', async () => {
      // Add unsectioned item
      await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'Car Keys',
      });

      // Add section with item
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Camp Kitchen',
      });
      await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section.id,
        title: 'Camp Stove',
      });

      // Delete section
      await EventsRepository.deleteSection(OWNER_ID, eventId, section.id);

      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.sections).toHaveLength(0);
      expect(details.unsectionedItems).toHaveLength(1);
      expect(details.unsectionedItems[0].title).toBe('Car Keys');
    });

    it('moving an item from a section to direct unsectioned via updateItem', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Water',
      });
      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section.id,
        title: 'Water Filter',
      });

      // Move item to unsectioned
      await EventsRepository.updateItem(OWNER_ID, eventId, item.id, {
        section_id: null,
      });

      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.sections[0].items).toHaveLength(0);
      expect(details.unsectionedItems).toHaveLength(1);
      expect(details.unsectionedItems[0].title).toBe('Water Filter');
    });
  });

  describe('Template Extraction with Direct Items', () => {
    it('saves a template containing direct items under a General Gear section', async () => {
      // Add direct items
      await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'First Aid Kit',
        quantity: '1 kit',
      });
      await EventsRepository.createItem(OWNER_ID, eventId, {
        title: 'Insect Repellent',
      });

      const template = await EventsRepository.saveTemplateFromEvent(OWNER_ID, eventId, {
        templateName: 'Day Hike Essentials',
      });

      expect(template.id).toBeDefined();

      const userTemplates = await EventsRepository.listTemplatesForUser(OWNER_ID);
      expect(userTemplates).toHaveLength(1);
      expect(userTemplates[0].name).toBe('Day Hike Essentials');
      expect(userTemplates[0].sections).toHaveLength(1);
      expect(userTemplates[0].sections[0].title).toBe('General Gear');
      expect(userTemplates[0].sections[0].items).toHaveLength(2);
    });
  });
});
