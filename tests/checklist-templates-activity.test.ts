import { describe, it, expect, beforeEach } from 'vitest';
import { EventsRepository } from '@/server/db/events-repository';
import { inviteRateLimiter } from '@/server/utils/rate-limiter';

describe('Phase 05 — Checklist, Templates & Activity Suite', () => {
  const OWNER_ID = 'user_clerk_owner_5';
  const PARTICIPANT_ID = 'user_clerk_member_5';
  const STRANGER_ID = 'user_clerk_stranger_5';

  let eventId: string;

  beforeEach(async () => {
    EventsRepository.resetMemoryStore();
    inviteRateLimiter.reset('ip_test');

    // Setup an initial event with owner and participant
    const { event } = await EventsRepository.createEvent(OWNER_ID, {
      title: 'Grand Canyon Rim-to-Rim',
      location: 'Grand Canyon, AZ',
    });
    eventId = event.id;

    // Add participant
    const invite = await EventsRepository.createInvite(OWNER_ID, eventId);
    await EventsRepository.joinEventWithCode(PARTICIPANT_ID, invite.invite_code, 'ip_test');
  });

  describe('1. Checklist Sections CRUD & Access Control', () => {
    it('allows participant to create a checklist section', async () => {
      const section = await EventsRepository.createSection(PARTICIPANT_ID, eventId, {
        title: 'Shelter & Sleeping',
      });

      expect(section.id).toBeDefined();
      expect(section.title).toBe('Shelter & Sleeping');
      expect(section.position).toBe(0);

      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.sections).toHaveLength(1);
      expect(details.sections[0].title).toBe('Shelter & Sleeping');
    });

    it('rejects section creation with empty title', async () => {
      await expect(
        EventsRepository.createSection(OWNER_ID, eventId, { title: '   ' })
      ).rejects.toThrowError('Section title is required.');
    });

    it('rejects non-members from creating sections with FORBIDDEN', async () => {
      await expect(
        EventsRepository.createSection(STRANGER_ID, eventId, { title: 'Cooking Gear' })
      ).rejects.toThrowError('You are not a participant in this event.');
    });

    it('updates section title successfully', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Cooking Gear',
      });

      const updated = await EventsRepository.updateSection(OWNER_ID, eventId, section.id, {
        title: 'Camp Kitchen & Cookware',
      });

      expect(updated.title).toBe('Camp Kitchen & Cookware');
    });

    it('deletes section and all contained items cascade cleanly', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Hydration',
      });

      await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section.id,
        title: '3L Water Bladder',
      });

      await EventsRepository.deleteSection(OWNER_ID, eventId, section.id);

      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.sections).toHaveLength(0);
    });
  });

  describe('2. Checklist Items & Assignee Validation', () => {
    it('creates items with optional notes, quantity, and valid member assignment', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Camp Kitchen',
      });

      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section.id,
        title: 'Backpacking Stove',
        quantity: '2 units',
        notes: 'Ultralight isobutane canister stoves',
        assignee_id: PARTICIPANT_ID,
      });

      expect(item.id).toBeDefined();
      expect(item.title).toBe('Backpacking Stove');
      expect(item.quantity).toBe('2 units');
      expect(item.notes).toBe('Ultralight isobutane canister stoves');
      expect(item.assignee_id).toBe(PARTICIPANT_ID);
      expect(item.is_completed).toBe(false);
    });

    it('strictly forbids assigning items to non-members', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Navigation',
      });

      await expect(
        EventsRepository.createItem(OWNER_ID, eventId, {
          section_id: section.id,
          title: 'Topographic Map',
          assignee_id: STRANGER_ID,
        })
      ).rejects.toThrowError('Assignee must be a member of this outing.');
    });

    it('toggles item completion and records timestamp + completer ID', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'First Aid',
      });

      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section.id,
        title: 'Emergency Medical Kit',
      });

      // Complete
      const completed = await EventsRepository.toggleItemCompletion(
        PARTICIPANT_ID,
        eventId,
        item.id,
        true
      );

      expect(completed.is_completed).toBe(true);
      expect(completed.completed_at).toBeDefined();
      expect(completed.completed_by).toBe(PARTICIPANT_ID);

      // Uncomplete
      const uncompleted = await EventsRepository.toggleItemCompletion(
        PARTICIPANT_ID,
        eventId,
        item.id,
        false
      );

      expect(uncompleted.is_completed).toBe(false);
      expect(uncompleted.completed_at).toBeNull();
      expect(uncompleted.completed_by).toBeNull();
    });

    it('updates item fields and logs assignment_changed activity', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Lighting',
      });

      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section.id,
        title: 'Headlamps',
        quantity: '1',
      });

      const updated = await EventsRepository.updateItem(OWNER_ID, eventId, item.id, {
        quantity: '4 units',
        assignee_id: PARTICIPANT_ID,
      });

      expect(updated.quantity).toBe('4 units');
      expect(updated.assignee_id).toBe(PARTICIPANT_ID);

      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      const assignActivity = details.activities.find(
        (a) => a.event_type === 'assignment_changed'
      );
      expect(assignActivity).toBeDefined();
    });

    it('deletes item cleanly and emits item_deleted activity', async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Trash & Packout',
      });

      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section.id,
        title: 'Heavy Duty Contractor Bags',
      });

      await EventsRepository.deleteItem(OWNER_ID, eventId, item.id);

      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      expect(details.sections[0].items).toHaveLength(0);

      const deletedActivity = details.activities.find((a) => a.event_type === 'item_deleted');
      expect(deletedActivity).toBeDefined();
    });
  });

  describe('3. Permanent Completed-Event Lock Invariant', () => {
    beforeEach(async () => {
      const section = await EventsRepository.createSection(OWNER_ID, eventId, {
        title: 'Essential Gear',
      });
      await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: section.id,
        title: 'Water Filter',
      });

      // Mark outing permanently completed
      await EventsRepository.completeEvent(OWNER_ID, eventId);
    });

    it('strictly forbids creating sections in a completed event', async () => {
      await expect(
        EventsRepository.createSection(OWNER_ID, eventId, { title: 'Late Additions' })
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');
    });

    it('strictly forbids updating sections in a completed event', async () => {
      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      const sectionId = details.sections[0].id;

      await expect(
        EventsRepository.updateSection(OWNER_ID, eventId, sectionId, { title: 'Renamed Section' })
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');
    });

    it('strictly forbids deleting sections in a completed event', async () => {
      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      const sectionId = details.sections[0].id;

      await expect(
        EventsRepository.deleteSection(OWNER_ID, eventId, sectionId)
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');
    });

    it('strictly forbids creating items in a completed event', async () => {
      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      const sectionId = details.sections[0].id;

      await expect(
        EventsRepository.createItem(OWNER_ID, eventId, {
          section_id: sectionId,
          title: 'Extra Batteries',
        })
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');
    });

    it('strictly forbids toggling item completion in a completed event', async () => {
      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      const itemId = details.sections[0].items[0].id;

      await expect(
        EventsRepository.toggleItemCompletion(OWNER_ID, eventId, itemId, true)
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');
    });

    it('strictly forbids deleting items in a completed event', async () => {
      const details = await EventsRepository.getEvent(OWNER_ID, eventId);
      const itemId = details.sections[0].items[0].id;

      await expect(
        EventsRepository.deleteItem(OWNER_ID, eventId, itemId)
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');
    });
  });

  describe('4. Personal Checklist Templates & Application', () => {
    it('creates a personal template from scratch', async () => {
      const template = await EventsRepository.createTemplate(OWNER_ID, {
        name: 'Weekend Backpacking Master List',
        description: 'Standard 3-season gear kit',
        sections: [
          {
            title: 'Camp Kitchen',
            items: [
              { title: 'Jetboil Flash', quantity: '1' },
              { title: 'Dehydrated Meals', quantity: '4 packs' },
            ],
          },
          {
            title: 'Sleep System',
            items: [{ title: '20F Down Quilt' }, { title: 'Inflatable Pad' }],
          },
        ],
      });

      expect(template.id).toBeDefined();
      expect(template.owner_id).toBe(OWNER_ID);

      const templates = await EventsRepository.listTemplatesForUser(OWNER_ID);
      expect(templates).toHaveLength(1);
      expect(templates[0].sections).toHaveLength(2);
      expect(templates[0].sections[0].items).toHaveLength(2);
    });

    it('saves a template from an existing event without carrying completion or assignees', async () => {
      const sec = await EventsRepository.createSection(OWNER_ID, eventId, { title: 'Basecamp' });
      const item = await EventsRepository.createItem(OWNER_ID, eventId, {
        section_id: sec.id,
        title: '6-Person Tent',
        quantity: '1',
        assignee_id: PARTICIPANT_ID,
      });
      await EventsRepository.toggleItemCompletion(OWNER_ID, eventId, item.id, true);

      // Save as template
      const template = await EventsRepository.saveTemplateFromEvent(OWNER_ID, eventId, {
        templateName: 'Basecamp Reusable Template',
      });

      expect(template.name).toBe('Basecamp Reusable Template');

      const templates = await EventsRepository.listTemplatesForUser(OWNER_ID);
      const saved = templates.find((t) => t.id === template.id);
      expect(saved?.sections[0].items[0].title).toBe('6-Person Tent');
    });

    it('applies a template to a clean empty event without modifying the template', async () => {
      // Create template
      const template = await EventsRepository.createTemplate(OWNER_ID, {
        name: 'Desert Survival Kit',
        sections: [
          {
            title: 'Water Supplies',
            items: [{ title: 'Electrolyte Tablets', quantity: '2 tubes' }],
          },
        ],
      });

      // Create a fresh clean empty event
      const { event: cleanTarget } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Empty Expedition',
      });

      // Apply template
      const result = await EventsRepository.applyTemplateToEvent(OWNER_ID, cleanTarget.id, template.id);
      expect(result.addedSectionsCount).toBe(1);
      expect(result.addedItemsCount).toBe(1);

      // Target event should now have the section and item
      const details = await EventsRepository.getEvent(OWNER_ID, cleanTarget.id);
      expect(details.sections).toHaveLength(1);
      expect(details.sections[0].title).toBe('Water Supplies');
      expect(details.sections[0].items[0].title).toBe('Electrolyte Tablets');

      // The original template remains untouched
      const templates = await EventsRepository.listTemplatesForUser(OWNER_ID);
      expect(templates[0].sections).toHaveLength(1);
    });

    it('strictly forbids applying templates if the event already has items or categories to avoid conflict or duplicates', async () => {
      const template = await EventsRepository.createTemplate(OWNER_ID, {
        name: 'Camp Kit',
        sections: [
          {
            title: 'Kitchen',
            items: [{ title: 'Stove' }],
          },
        ],
      });

      // Case A: Event already has a section
      const { event: targetWithSection } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Trip With Section',
      });
      await EventsRepository.createSection(OWNER_ID, targetWithSection.id, { title: 'Pre-existing Section' });

      await expect(
        EventsRepository.applyTemplateToEvent(OWNER_ID, targetWithSection.id, template.id)
      ).rejects.toThrowError(/Cannot apply template to an event that already has items or categories/);

      // Case B: Event already has a direct unsectioned item
      const { event: targetWithItem } = await EventsRepository.createEvent(OWNER_ID, {
        title: 'Trip With Direct Item',
      });
      await EventsRepository.createItem(OWNER_ID, targetWithItem.id, { title: 'Direct Flashlight' });

      await expect(
        EventsRepository.applyTemplateToEvent(OWNER_ID, targetWithItem.id, template.id)
      ).rejects.toThrowError(/Cannot apply template to an event that already has items or categories/);
    });

    it('strictly forbids applying templates to completed events', async () => {
      const template = await EventsRepository.createTemplate(OWNER_ID, {
        name: 'Winter Camping',
      });

      await EventsRepository.completeEvent(OWNER_ID, eventId);

      await expect(
        EventsRepository.applyTemplateToEvent(OWNER_ID, eventId, template.id)
      ).rejects.toThrowError('This event is completed and permanently locked against mutations.');
    });

    it('enforces template isolation between users', async () => {
      const template = await EventsRepository.createTemplate(OWNER_ID, {
        name: 'Private Solo Template',
      });

      // Stranger cannot list owner's templates
      const strangerTemplates = await EventsRepository.listTemplatesForUser(STRANGER_ID);
      expect(strangerTemplates).toHaveLength(0);

      // Stranger cannot delete owner's template
      await expect(
        EventsRepository.deleteTemplate(STRANGER_ID, template.id)
      ).rejects.toThrowError('TEMPLATE_NOT_FOUND');
    });
  });
});
