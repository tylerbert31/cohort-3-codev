import { describe, it, expect, vi } from 'vitest';
import { sanitizeProfileSync } from '@/server/auth/authorization';

describe('Phase 03 — Authentication & Profile Synchronization', () => {
  describe('Profile Payload Sanitation & Security', () => {
    it('successfully extracts and sanitizes Clerk user details', () => {
      const sanitized = sanitizeProfileSync({
        clerk_user_id: 'user_clerk_12345',
        first_name: '  Morgan ',
        last_name: ' Lee  ',
        image_url: 'https://img.clerk.com/avatar123.jpg',
      });

      expect(sanitized.clerk_user_id).toBe('user_clerk_12345');
      expect(sanitized.first_name).toBe('Morgan');
      expect(sanitized.last_name).toBe('Lee');
      expect(sanitized.image_url).toBe('https://img.clerk.com/avatar123.jpg');
    });

    it('handles Google OAuth users without last names cleanly', () => {
      const sanitized = sanitizeProfileSync({
        clerk_user_id: 'user_google_999',
        first_name: 'Skyler',
        last_name: null,
        image_url: null,
      });

      expect(sanitized.first_name).toBe('Skyler');
      expect(sanitized.last_name).toBeNull();
      expect(sanitized.image_url).toBeNull();
    });

    it('preserves updated profile image URLs when an avatar is refreshed', () => {
      const oldAvatar = sanitizeProfileSync({
        clerk_user_id: 'user_avatar_update',
        image_url: 'https://img.clerk.com/old.png',
      });
      const newAvatar = sanitizeProfileSync({
        clerk_user_id: 'user_avatar_update',
        image_url: 'https://img.clerk.com/new_highres.png',
      });

      expect(oldAvatar.image_url).toBe('https://img.clerk.com/old.png');
      expect(newAvatar.image_url).toBe('https://img.clerk.com/new_highres.png');
    });

    it('strictly forbids profile sync without a valid Clerk User ID', () => {
      expect(() =>
        sanitizeProfileSync({ clerk_user_id: '' })
      ).toThrowError('Valid clerk_user_id is required for profile sync.');
    });
  });

  describe('Protected Route Coverage Specification', () => {
    const publicPatterns = [
      /^\/sign-in.*$/,
      /^\/sign-up.*$/,
      /^\/api\/webhook.*$/,
      /^\/api\/health.*$/,
    ];

    const isPublic = (path: string) => publicPatterns.some((pattern) => pattern.test(path));

    it('identifies public auth and webhook routes correctly', () => {
      expect(isPublic('/sign-in')).toBe(true);
      expect(isPublic('/sign-in/factor-one')).toBe(true);
      expect(isPublic('/sign-up')).toBe(true);
      expect(isPublic('/api/webhook/clerk')).toBe(true);
    });

    it('strictly identifies application routes as protected', () => {
      expect(isPublic('/')).toBe(false);
      expect(isPublic('/events/123')).toBe(false);
      expect(isPublic('/templates')).toBe(false);
      expect(isPublic('/settings')).toBe(false);
    });
  });
});
