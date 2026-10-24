import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

/**
 * Resolves a redirect destination into an absolute URL using the client window's current origin.
 *
 * This addresses the issue where mobile devices accessing the Next.js development server
 * over local Wi-Fi / IP (e.g., http://192.168.5.108:3000) are redirected by Clerk/Google OAuth
 * to http://localhost:3000 (which fails on phones because localhost points to the phone itself).
 *
 * It guarantees:
 * 1. Absolute URLs pointing to localhost/127.0.0.1 are rewritten to the active origin.
 * 2. Relative redirect paths (e.g., /events/123 or /join/CODE) are prepended with window.location.origin.
 * 3. Any query parameters and hash fragments on the redirect target are preserved.
 * 4. Gracefully degrades to fallbackPath when running on the server (SSR).
 */
export function resolveDynamicRedirectUrl(
  paramUrl?: string | null,
  fallbackPath: string = '/'
): string {
  if (typeof window === 'undefined') {
    return fallbackPath;
  }

  const currentOrigin = window.location.origin;

  if (!paramUrl) {
    const cleanFallback = fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`;
    return `${currentOrigin}${cleanFallback}`;
  }

  // Handle relative paths (e.g. "/events/abc", "join/xyz")
  if (!paramUrl.startsWith('http://') && !paramUrl.startsWith('https://')) {
    const cleanPath = paramUrl.startsWith('/') ? paramUrl : `/${paramUrl}`;
    return `${currentOrigin}${cleanPath}`;
  }

  // Handle absolute URLs
  try {
    const parsed = new URL(paramUrl);
    // If the URL host is localhost or loopback 127.0.0.1, rewrite origin to current active origin
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return `${currentOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    const cleanFallback = fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`;
    return `${currentOrigin}${cleanFallback}`;
  }
}

/**
 * React hook that extracts the 'redirect_url' query parameter and resolves
 * it against the active client origin for Clerk components (<SignIn />, <SignUp />, etc.).
 */
export function useDynamicRedirectUrl(fallbackPath: string = '/'): string {
  const searchParams = useSearchParams();
  const redirectUrlParam = searchParams?.get('redirect_url');

  return useMemo(() => {
    return resolveDynamicRedirectUrl(redirectUrlParam, fallbackPath);
  }, [redirectUrlParam, fallbackPath]);
}
