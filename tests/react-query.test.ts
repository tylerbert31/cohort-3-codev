import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/query';

describe('TanStack React Query — Query Keys & Conventions', () => {
  it('generates consistent and scoped query keys for events', () => {
    expect(queryKeys.events.all).toEqual(['events']);
    expect(queryKeys.events.list()).toEqual(['events', 'list']);
    expect(queryKeys.events.detail('event-123')).toEqual(['events', 'detail', 'event-123']);
  });

  it('generates scoped query keys for templates', () => {
    expect(queryKeys.templates.all).toEqual(['templates']);
    expect(queryKeys.templates.list()).toEqual(['templates', 'list']);
  });

  it('generates scoped query keys for invite code validation', () => {
    expect(queryKeys.invites.all).toEqual(['invites']);
    expect(queryKeys.invites.validate('SIERRA26')).toEqual(['invites', 'validate', 'SIERRA26']);
    expect(queryKeys.invites.validate('  sierra26 ')).toEqual(['invites', 'validate', 'SIERRA26']);
  });

  it('provides isolated query keys for user profile synchronization', () => {
    expect(queryKeys.profile.sync).toEqual(['profile', 'sync']);
  });
});
