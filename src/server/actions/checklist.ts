'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { EventsRepository } from '@/server/db/events-repository';
import type {
  ChecklistSection,
  ChecklistItem,
  ChecklistTemplate,
  TemplateSection,
  TemplateItem,
} from '@/types/database';
import type { ActionResponse } from './events';

// ============================================================================
// SECTION SERVER ACTIONS
// ============================================================================

export async function createSectionAction(input: {
  eventId: string;
  title: string;
  position?: number;
}): Promise<ActionResponse<ChecklistSection>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const section = await EventsRepository.createSection(userId, input.eventId, {
      title: input.title,
      position: input.position,
    });

    revalidatePath(`/events/${input.eventId}`);
    return { success: true, data: section };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create section.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

export async function updateSectionAction(input: {
  eventId: string;
  sectionId: string;
  title?: string;
  position?: number;
}): Promise<ActionResponse<ChecklistSection>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const section = await EventsRepository.updateSection(
      userId,
      input.eventId,
      input.sectionId,
      {
        title: input.title,
        position: input.position,
      }
    );

    revalidatePath(`/events/${input.eventId}`);
    return { success: true, data: section };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update section.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

export async function deleteSectionAction(input: {
  eventId: string;
  sectionId: string;
  keepItems?: boolean;
}): Promise<ActionResponse<boolean>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    await EventsRepository.deleteSection(userId, input.eventId, input.sectionId, {
      keepItems: input.keepItems,
    });

    revalidatePath(`/events/${input.eventId}`);
    return { success: true, data: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete section.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

// ============================================================================
// ITEM SERVER ACTIONS
// ============================================================================

export async function createItemAction(input: {
  eventId: string;
  section_id?: string | null;
  title: string;
  notes?: string | null;
  quantity?: string | null;
  assignee_id?: string | null;
  deadline?: string | null;
}): Promise<ActionResponse<ChecklistItem>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const item = await EventsRepository.createItem(userId, input.eventId, {
      section_id: input.section_id,
      title: input.title,
      notes: input.notes,
      quantity: input.quantity,
      assignee_id: input.assignee_id,
      deadline: input.deadline,
    });

    revalidatePath(`/events/${input.eventId}`);
    return { success: true, data: item };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create item.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

export async function updateItemAction(input: {
  eventId: string;
  itemId: string;
  title?: string;
  notes?: string | null;
  quantity?: string | null;
  section_id?: string | null;
  assignee_id?: string | null;
  deadline?: string | null;
}): Promise<ActionResponse<ChecklistItem>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const item = await EventsRepository.updateItem(
      userId,
      input.eventId,
      input.itemId,
      {
        title: input.title,
        notes: input.notes,
        quantity: input.quantity,
        section_id: input.section_id,
        assignee_id: input.assignee_id,
        deadline: input.deadline,
      }
    );

    revalidatePath(`/events/${input.eventId}`);
    return { success: true, data: item };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update item.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

export async function toggleItemCompletionAction(input: {
  eventId: string;
  itemId: string;
  isCompleted: boolean;
}): Promise<ActionResponse<ChecklistItem>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const item = await EventsRepository.toggleItemCompletion(
      userId,
      input.eventId,
      input.itemId,
      input.isCompleted
    );

    revalidatePath(`/events/${input.eventId}`);
    return { success: true, data: item };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to toggle item.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

export async function deleteItemAction(input: {
  eventId: string;
  itemId: string;
}): Promise<ActionResponse<boolean>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    await EventsRepository.deleteItem(userId, input.eventId, input.itemId);

    revalidatePath(`/events/${input.eventId}`);
    return { success: true, data: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete item.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

// ============================================================================
// TEMPLATE SERVER ACTIONS
// ============================================================================

/**
 * Manual template creation is disabled.
 * Templates must be created by copying from an existing event via saveTemplateFromEventAction.
 */
export async function createTemplateAction(
  input?: {
    name?: string;
    description?: string | null;
    sections?: { title: string; items?: { title: string; quantity?: string; notes?: string }[] }[];
  }
): Promise<ActionResponse<ChecklistTemplate>> {
  void input;
  return {
    success: false,
    error: 'Manual template creation is disabled. Templates can only be created by copying from an existing event.',
    code: 'FORBIDDEN',
  };
}

export async function saveTemplateFromEventAction(input: {
  eventId: string;
  templateName: string;
  description?: string | null;
}): Promise<ActionResponse<ChecklistTemplate>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const template = await EventsRepository.saveTemplateFromEvent(
      userId,
      input.eventId,
      {
        templateName: input.templateName,
        description: input.description,
      }
    );

    revalidatePath('/templates');
    return { success: true, data: template };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save template.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

export async function applyTemplateToEventAction(input: {
  eventId: string;
  templateId: string;
}): Promise<ActionResponse<{ addedSectionsCount: number; addedItemsCount: number }>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const result = await EventsRepository.applyTemplateToEvent(
      userId,
      input.eventId,
      input.templateId
    );

    revalidatePath(`/events/${input.eventId}`);
    return { success: true, data: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to apply template.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}

export async function listUserTemplatesAction(): Promise<
  ActionResponse<
    (ChecklistTemplate & {
      sections: (TemplateSection & { items: TemplateItem[] })[];
    })[]
  >
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    const templates = await EventsRepository.listTemplatesForUser(userId);
    return { success: true, data: templates };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list templates.';
    return { success: false, error: message };
  }
}

export async function deleteTemplateAction(
  templateId: string
): Promise<ActionResponse<boolean>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' };
    }

    await EventsRepository.deleteTemplate(userId, templateId);

    revalidatePath('/templates');
    return { success: true, data: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete template.';
    const code = (err as { code?: string })?.code || 'ERROR';
    return { success: false, error: message, code };
  }
}
