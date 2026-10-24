import { describe, it, expect, beforeEach } from 'vitest';
import { EventsRepository } from '@/server/db/events-repository';
import { createTemplateAction } from '@/server/actions/checklist';

const USER_ID = 'user_template_tester_123';
const STRANGER_ID = 'user_stranger_456';

describe('Template Refactor & Invariant Constraints Suite', () => {
  beforeEach(() => {
    EventsRepository.resetMemoryStore();
    EventsRepository.upsertProfile({
      clerk_user_id: USER_ID,
      first_name: 'Trail',
      last_name: 'Runner',
    });
    EventsRepository.upsertProfile({
      clerk_user_id: STRANGER_ID,
      first_name: 'Stranger',
      last_name: 'Danger',
    });
  });

  describe('1. Manual Template Creation Restriction', () => {
    it('disables manual createTemplateAction and returns FORBIDDEN code', async () => {
      const res = await createTemplateAction({
        name: 'Manual Alpine Backpacking',
        description: 'Should not be allowed to create manually',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('FORBIDDEN');
        expect(res.error).toMatch(/Manual template creation is disabled/);
      }

      // Verify no template was created in the repository
      const templates = await EventsRepository.listTemplatesForUser(USER_ID);
      expect(templates).toHaveLength(0);
    });
  });

  describe('2. Template Creation from Existing Events Only', () => {
    it('forbids saving a template from an empty trip with no items or sections', async () => {
      const { event: emptyTrip } = await EventsRepository.createEvent(USER_ID, {
        title: 'Empty Overnight Camp',
      });

      await expect(
        EventsRepository.saveTemplateFromEvent(USER_ID, emptyTrip.id, {
          templateName: 'Empty Template Attempt',
        })
      ).rejects.toThrowError(/Cannot save template from an empty trip/);
    });

    it('successfully extracts and copies a template from an existing trip with sections and items', async () => {
      const { event: sourceTrip } = await EventsRepository.createEvent(USER_ID, {
        title: 'Cascade High Camp',
      });

      // Add a category with items
      const section = await EventsRepository.createSection(USER_ID, sourceTrip.id, {
        title: 'Shelter & Sleep',
      });
      await EventsRepository.createItem(USER_ID, sourceTrip.id, {
        title: 'Ultralight 2P Tent',
        section_id: section.id,
        quantity: '1',
      });

      // Add direct unsectioned item
      await EventsRepository.createItem(USER_ID, sourceTrip.id, {
        title: 'National Park Pass',
        quantity: '1 card',
      });

      const template = await EventsRepository.saveTemplateFromEvent(USER_ID, sourceTrip.id, {
        templateName: 'Cascade Loadout Template',
        description: 'Copied from Cascade High Camp',
      });

      expect(template.name).toBe('Cascade Loadout Template');
      expect(template.description).toBe('Copied from Cascade High Camp');

      // Verify template structure in store
      const userTemplates = await EventsRepository.listTemplatesForUser(USER_ID);
      expect(userTemplates).toHaveLength(1);
      expect(userTemplates[0].sections).toHaveLength(2); // Shelter & Sleep + General Gear
      const shelterSec = userTemplates[0].sections.find((s) => s.title === 'Shelter & Sleep');
      expect(shelterSec?.items).toBeDefined();
      expect(shelterSec?.items?.length).toBe(1);
      expect(shelterSec?.items?.[0].title).toBe('Ultralight 2P Tent');

      const generalSec = userTemplates[0].sections.find((s) => s.title === 'General Gear');
      expect(generalSec?.items).toBeDefined();
      expect(generalSec?.items?.length).toBe(1);
      expect(generalSec?.items?.[0].title).toBe('National Park Pass');
    });
  });

  describe('3. Apply Template Constraints: Forbidding Non-Empty Events', () => {
    let templateId: string;

    beforeEach(async () => {
      // Create source trip and extract template
      const { event: sourceTrip } = await EventsRepository.createEvent(USER_ID, {
        title: 'Master Trip',
      });
      const section = await EventsRepository.createSection(USER_ID, sourceTrip.id, {
        title: 'Camp Kitchen',
      });
      await EventsRepository.createItem(USER_ID, sourceTrip.id, {
        title: 'Isobutane Stove',
        section_id: section.id,
      });

      const template = await EventsRepository.saveTemplateFromEvent(USER_ID, sourceTrip.id, {
        templateName: 'Kitchen Master Template',
      });
      templateId = template.id;
    });

    it('strictly forbids applying template if target event has existing categories', async () => {
      const { event: targetTrip } = await EventsRepository.createEvent(USER_ID, {
        title: 'Target Trip With Category',
      });
      await EventsRepository.createSection(USER_ID, targetTrip.id, {
        title: 'Existing Category',
      });

      await expect(
        EventsRepository.applyTemplateToEvent(USER_ID, targetTrip.id, templateId)
      ).rejects.toThrowError(/Cannot apply template to an event that already has items or categories/);

      // Verify target event was not mutated
      const details = await EventsRepository.getEvent(USER_ID, targetTrip.id);
      expect(details.sections).toHaveLength(1);
      expect(details.sections[0].title).toBe('Existing Category');
    });

    it('strictly forbids applying template if target event has direct unsectioned items', async () => {
      const { event: targetTrip } = await EventsRepository.createEvent(USER_ID, {
        title: 'Target Trip With Direct Item',
      });
      await EventsRepository.createItem(USER_ID, targetTrip.id, {
        title: 'Headlamp',
      });

      await expect(
        EventsRepository.applyTemplateToEvent(USER_ID, targetTrip.id, templateId)
      ).rejects.toThrowError(/Cannot apply template to an event that already has items or categories/);

      // Verify target event was not mutated
      const details = await EventsRepository.getEvent(USER_ID, targetTrip.id);
      expect(details.unsectionedItems).toHaveLength(1);
      expect(details.sections).toHaveLength(0);
    });

    it('successfully applies template when target event is completely empty', async () => {
      const { event: emptyTarget } = await EventsRepository.createEvent(USER_ID, {
        title: 'Clean Empty Trip',
      });

      const result = await EventsRepository.applyTemplateToEvent(USER_ID, emptyTarget.id, templateId);
      expect(result.addedSectionsCount).toBe(1);
      expect(result.addedItemsCount).toBe(1);

      const details = await EventsRepository.getEvent(USER_ID, emptyTarget.id);
      expect(details.sections).toHaveLength(1);
      expect(details.sections[0].title).toBe('Camp Kitchen');
      expect(details.sections[0].items[0].title).toBe('Isobutane Stove');

      // Check activity event was recorded
      expect(details.activities).toHaveLength(2); // event_created + section_created
      expect(details.activities[0].event_type).toBe('section_created');
    });

    it('strictly forbids applying template if target event is locked/completed', async () => {
      const { event: emptyTarget } = await EventsRepository.createEvent(USER_ID, {
        title: 'Completed Expedition',
      });
      await EventsRepository.completeEvent(USER_ID, emptyTarget.id);

      await expect(
        EventsRepository.applyTemplateToEvent(USER_ID, emptyTarget.id, templateId)
      ).rejects.toThrowError(/This event is completed and permanently locked against mutations/);
    });
  });
});
