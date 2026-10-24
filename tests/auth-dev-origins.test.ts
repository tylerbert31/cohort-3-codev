import { describe, it, expect, afterEach } from 'vitest';
import { resolveDynamicRedirectUrl } from '../src/lib/auth-redirect';
import packageJson from '../package.json';
import nextConfig from '../next.config';

describe('Local IP Dev Origins & Auth Redirects', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    // Restore original window
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  });

  describe('resolveDynamicRedirectUrl', () => {
    it('returns fallbackPath when window is undefined (SSR)', () => {
      delete (globalThis as Record<string, unknown>).window;

      expect(resolveDynamicRedirectUrl(undefined, '/')).toBe('/');
      expect(resolveDynamicRedirectUrl('/events/123', '/')).toBe('/');
      expect(resolveDynamicRedirectUrl(undefined, '/join/ABC')).toBe('/join/ABC');
    });

    it('resolves default fallback URL to active window origin when no param provided', () => {
      // Simulate mobile device visiting LAN IP
      (globalThis as Record<string, unknown>).window = {
        location: {
          origin: 'http://192.168.5.108:3000',
        },
      };

      const result = resolveDynamicRedirectUrl(null, '/');
      expect(result).toBe('http://192.168.5.108:3000/');
    });

    it('resolves relative paths against active window origin', () => {
      (globalThis as Record<string, unknown>).window = {
        location: {
          origin: 'http://192.168.5.108:3000',
        },
      };

      expect(resolveDynamicRedirectUrl('/events/trip-2026', '/')).toBe(
        'http://192.168.5.108:3000/events/trip-2026'
      );
      expect(resolveDynamicRedirectUrl('join/SUMMER26', '/')).toBe(
        'http://192.168.5.108:3000/join/SUMMER26'
      );
    });

    it('rewrites localhost:3000 redirects to active LAN origin to prevent mobile ERR_CONNECTION_REFUSED', () => {
      (globalThis as Record<string, unknown>).window = {
        location: {
          origin: 'http://192.168.5.108:3000',
        },
      };

      const localhostTarget = 'http://localhost:3000/events/trip-2026?invite=XYZ#checklist';
      const resolved = resolveDynamicRedirectUrl(localhostTarget, '/');
      expect(resolved).toBe('http://192.168.5.108:3000/events/trip-2026?invite=XYZ#checklist');
    });

    it('rewrites 127.0.0.1:3000 redirects to active LAN origin', () => {
      (globalThis as Record<string, unknown>).window = {
        location: {
          origin: 'http://192.168.1.42:3000',
        },
      };

      const loopbackTarget = 'http://127.0.0.1:3000/templates';
      const resolved = resolveDynamicRedirectUrl(loopbackTarget, '/');
      expect(resolved).toBe('http://192.168.1.42:3000/templates');
    });

    it('preserves valid LAN origin matching current origin', () => {
      (globalThis as Record<string, unknown>).window = {
        location: {
          origin: 'http://192.168.5.108:3000',
        },
      };

      const matchingTarget = 'http://192.168.5.108:3000/dashboard';
      const resolved = resolveDynamicRedirectUrl(matchingTarget, '/');
      expect(resolved).toBe('http://192.168.5.108:3000/dashboard');
    });

    it('safely handles malformed URLs by falling back to active origin and fallback path', () => {
      (globalThis as Record<string, unknown>).window = {
        location: {
          origin: 'http://192.168.5.108:3000',
        },
      };

      const malformedTarget = 'http://[invalid-host';
      const resolved = resolveDynamicRedirectUrl(malformedTarget, '/templates');
      expect(resolved).toBe('http://192.168.5.108:3000/templates');
    });
  });

  describe('Configuration validation', () => {
    it('package.json binds Next.js dev server to 0.0.0.0 for LAN/mobile access', () => {
      expect(packageJson.scripts.dev).toContain('-H 0.0.0.0');
    });

    it('next.config.ts configures allowedDevOrigins including local IP patterns', () => {
      const allowedOrigins = nextConfig.allowedDevOrigins;
      expect(Array.isArray(allowedOrigins)).toBe(true);
      expect(allowedOrigins).toContain('192.168.5.108');
      expect(allowedOrigins).toContain('192.168.*');
      expect(allowedOrigins).toContain('*.local');
    });
  });
});
