import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Landing Page & Public Route Access (Anti-Force-Login Protection)', () => {
  const proxyFilePath = path.resolve(__dirname, '../src/proxy.ts');
  const proxyContent = fs.readFileSync(proxyFilePath, 'utf-8');

  it('declares root route "/" as public to prevent unauthenticated users from being force-logged in', () => {
    // Root route must be included in isPublicRoute
    expect(proxyContent).toMatch(/isPublicRoute\s*=\s*createRouteMatcher\(\[\s*['"]\/['"]/);
  });

  it('declares invitation route "/join(.*)" as public so prospective members can review trips before auth', () => {
    expect(proxyContent).toContain("'/join(.*)'");
  });

  it('declares landing route "/landing(.*)" as public for direct landing access', () => {
    expect(proxyContent).toContain("'/landing(.*)'");
  });

  it('declares auth entry routes as public', () => {
    expect(proxyContent).toContain("'/sign-in(.*)'");
    expect(proxyContent).toContain("'/sign-up(.*)'");
  });

  it('keeps protected routes like /events and /templates guarded by auth.protect()', () => {
    // Verified that /events and /templates are NOT added to public route matcher
    expect(proxyContent).not.toContain("'/events");
    expect(proxyContent).not.toContain("'/templates");
    expect(proxyContent).toContain('await auth.protect()');
  });

  it('persists Master Design System and Landing Page specifications in design-system directory', () => {
    const masterPath = path.resolve(__dirname, '../design-system/cohort/MASTER.md');
    const landingDocPath = path.resolve(__dirname, '../design-system/cohort/pages/landing.md');

    expect(fs.existsSync(masterPath)).toBe(true);
    expect(fs.existsSync(landingDocPath)).toBe(true);

    const masterContent = fs.readFileSync(masterPath, 'utf-8');
    expect(masterContent).toContain('Trailhead Field Notes');
    expect(masterContent).toContain('Fraunces');
    expect(masterContent).toContain('Inter');
    expect(masterContent).toContain('44px');
  });

  it('includes interactive live simulation, bento features, quick code join, and FAQ in landing page', () => {
    const landingComponentPath = path.resolve(
      __dirname,
      '../src/components/landing/landing-page.tsx'
    );
    expect(fs.existsSync(landingComponentPath)).toBe(true);

    const content = fs.readFileSync(landingComponentPath, 'utf-8');

    // Key conversion and UX elements
    expect(content).toContain('The best gear is the gear you remembered');
    expect(content).toContain('More trail time. Less admin.');
    expect(content).toContain('Already have an invite?');
    expect(content).toContain('Field guide / FAQ');
    expect(content).toContain('One shared plan for the people, the gear');

    // Accessibility and interaction attributes
    expect(content).toContain('focus:ring-2');
    expect(content).toContain('role="alert"');
    expect(content).toContain('aria-label="Join trip with invite code"');
    expect(content).toContain('aria-expanded={faqOpen === index}');
  });
});
