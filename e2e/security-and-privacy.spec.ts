import { expect, test } from '@playwright/test';
import { expectNoCriticalHorizontalOverflow } from './helpers/app';

test('expose les en-têtes de sécurité et la confidentialité avant le profil', async ({ page }) => {
  const response = await page.goto('/#/privacy', { waitUntil: 'domcontentloaded' });
  expect(response).not.toBeNull();

  const headers = response?.headers() ?? {};
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['permissions-policy']).toContain('camera=(self)');
  expect(headers['permissions-policy']).toContain('microphone=()');
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).not.toContain("'unsafe-eval'");

  await expect(page.getByRole('heading', { name: 'Confidentialité' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open Food Facts' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Caméra et scanner' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Retour à la création du profil' })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
