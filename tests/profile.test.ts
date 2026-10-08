import { describe, expect, it } from 'vitest';
import { hasChanges, initialProfile, normalizeProfile, saveDemoProfile, validateProfile } from '../src/profile';
import { breadcrumbs, isMenuActive, resolveRoute, routes } from '../src/routes';
import { escapeHtml } from '../src/html';

describe('profile validation and save contract', () => {
  it('accepts optional empty contact fields and rejects missing required names', () => {
    expect(validateProfile({ ...initialProfile, phone: '', city: '', bio: '' })).toEqual({});
    expect(validateProfile({ ...initialProfile, firstName: '  ', lastName: '' })).toMatchObject({ firstName: expect.any(String), lastName: expect.any(String) });
  });
  it('rejects invalid email, phone, oversized biography and unknown timezone', () => {
    expect(Object.keys(validateProfile({ ...initialProfile, email: 'bad', phone: 'letters1234567890', bio: 'a'.repeat(281), timezone: 'unknown' })).sort()).toEqual(['bio', 'email', 'phone', 'timezone']);
  });
  it('normalizes before validation and accurately tracks reverted changes', () => {
    const draft = { ...initialProfile, firstName: ' Александр ' };
    expect(hasChanges(draft, initialProfile)).toBe(true);
    expect(normalizeProfile(draft)).toEqual(initialProfile);
    expect(hasChanges(initialProfile, { ...initialProfile })).toBe(false);
  });
  it('returns an independent value on success and rejects simulated failure', async () => {
    const result = await saveDemoProfile(initialProfile, false);
    expect(result).toEqual(initialProfile);
    expect(result).not.toBe(initialProfile);
    await expect(saveDemoProfile(initialProfile, true)).rejects.toThrow('Не удалось');
  });
});

describe('shared registry', () => {
  it('maps both overview URLs to the same view without rewriting the URL', () => {
    expect(resolveRoute('/dashboard')?.page).toBe('overview');
    expect(resolveRoute('/dashboard/overview')?.page).toBe('overview');
    expect(resolveRoute('/dashboard/profile/')?.page).toBe('profile');
    expect(resolveRoute('/dashboard/not-a-route')).toBeUndefined();
  });
  it('keeps the parent active and produces the correct professional breadcrumbs', () => {
    const professional = resolveRoute('/dashboard/profile/professional')!;
    expect(breadcrumbs(professional).map(route => route.path)).toEqual(['/dashboard', '/dashboard/profile', '/dashboard/profile/professional']);
    expect(isMenuActive(resolveRoute('/dashboard/profile')!, professional)).toBe(true);
    expect(new Set(routes.map(route => route.path)).size).toBe(6);
  });
  it('escapes user text before inserting it into HTML', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });
});
