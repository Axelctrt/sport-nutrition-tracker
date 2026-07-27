import { expect, type Page } from '@playwright/test';

const ONBOARDING_BOOTSTRAP_ATTEMPTS = 3;
const ONBOARDING_BOOTSTRAP_TIMEOUT_MS = 8_000;

async function openOnboarding(page: Page): Promise<void> {
  const localModeButton = page.getByRole('button', {
    name: 'Choisir le mode local',
  });
  let lastError: unknown;

  for (let attempt = 1; attempt <= ONBOARDING_BOOTSTRAP_ATTEMPTS; attempt += 1) {
    const cacheBuster = `${Date.now()}-${attempt}`;

    try {
      await page.goto(`/?e2eBootstrap=${cacheBuster}#/onboarding`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(localModeButton).toBeVisible({
        timeout: ONBOARDING_BOOTSTRAP_TIMEOUT_MS,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < ONBOARDING_BOOTSTRAP_ATTEMPTS) {
        await page.goto('about:blank', { waitUntil: 'load' });
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Impossible de charger le choix du mode onboarding.');
}

export async function createLocalProfile(page: Page, firstName = 'E2E'): Promise<void> {
  await openOnboarding(page);

  await page.getByRole('button', { name: 'Choisir le mode local' }).click();

  const profileProgress = page.getByRole('progressbar', {
    name: 'Progression de la configuration',
  });
  await expect(profileProgress).toHaveAttribute('aria-valuenow', '1');
  await page.getByLabel(/Nom affiché/).fill(firstName);

  for (let step = 2; step <= 9; step += 1) {
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(profileProgress).toHaveAttribute('aria-valuenow', String(step));
  }

  await expect(page.getByRole('button', { name: 'Commencer' })).toBeVisible();
  await page.getByRole('button', { name: 'Commencer' }).click();
  await expect(page.getByRole('heading', { name: `Bonjour ${firstName}` })).toBeVisible();
}

export async function expectNoCriticalHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

export async function expectEssentialContentVisible(page: Page): Promise<void> {
  const issues = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(
      '[data-responsive-essential], main h1, main h2, nav[aria-label="Navigation mobile"] a[href]',
    ));

    return elements.flatMap((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (
        style.display === 'none'
        || style.visibility === 'hidden'
        || rect.width === 0
        || rect.height === 0
      ) {
        return [];
      }

      const label = element.getAttribute('aria-label')
        ?? element.textContent?.replace(/\s+/g, ' ').trim()
        ?? element.tagName;
      const problems: string[] = [];
      if (rect.left < -1 || rect.right > viewportWidth + 1) {
        problems.push('sort horizontalement du viewport');
      }
      if (element.matches('[data-responsive-essential="action"]')) {
        if (rect.width < 44 || rect.height < 44) {
          problems.push(`zone tactile ${Math.round(rect.width)}×${Math.round(rect.height)}`);
        }
        if (element.scrollWidth > element.clientWidth + 1) {
          problems.push('libellé horizontalement masqué');
        }
        if (element.scrollHeight > element.clientHeight + 1) {
          problems.push('libellé verticalement masqué');
        }
      }
      if (
        element.matches('[data-responsive-essential="value"]')
        && (element.scrollWidth > element.clientWidth + 1
          || element.scrollHeight > element.clientHeight + 1)
      ) {
        problems.push('valeur masquée');
      }
      if (rect.top < viewportHeight && rect.bottom > 0 && style.opacity === '0') {
        problems.push('contenu essentiel invisible');
      }

      return problems.map((problem) => ({ label, problem }));
    });
  });

  expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
}

export async function getBrowserLocalDate(page: Page): Promise<string> {
  return page.evaluate(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
}


interface AccessibilityBaselineOptions {
  expectedHeading?: string | RegExp;
  checkShellTouchTargets?: boolean;
}

interface AccessibilityIssue {
  selector: string;
  reason: string;
}

export async function expectPageAccessibilityBaseline(
  page: Page,
  options: AccessibilityBaselineOptions = {},
): Promise<void> {
  await expectNoCriticalHorizontalOverflow(page);

  await expect(page.locator('html')).toHaveAttribute('lang', /^fr(?:-|$)/);
  await expect(page.locator('main#main-content')).toHaveCount(1);

  if (options.expectedHeading) {
    await expect(page.getByRole('heading', { level: 1, name: options.expectedHeading })).toBeVisible();
  }

  const issues = await page.evaluate(() => {
    const visible = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };

    const selectorFor = (element: Element) => {
      const tag = element.tagName.toLowerCase();
      const id = element.getAttribute('id');
      if (id) return `${tag}#${id}`;
      const name = element.getAttribute('name');
      if (name) return `${tag}[name="${name}"]`;
      return tag;
    };

    const result: AccessibilityIssue[] = [];
    const ids = new Map<string, number>();
    document.querySelectorAll<HTMLElement>('[id]').forEach((element) => {
      ids.set(element.id, (ids.get(element.id) ?? 0) + 1);
    });
    ids.forEach((count, id) => {
      if (count > 1) result.push({ selector: `#${id}`, reason: `identifiant dupliqué (${count})` });
    });

    document.querySelectorAll<HTMLElement>('button, a[href]').forEach((element) => {
      if (!visible(element)) return;
      const labelledBy = element.getAttribute('aria-labelledby');
      const labelledText = labelledBy
        ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
        : '';
      const name = [
        element.getAttribute('aria-label') ?? '',
        labelledText,
        element.textContent ?? '',
        element.getAttribute('title') ?? '',
      ].join(' ').replace(/\s+/g, ' ').trim();
      if (!name) result.push({ selector: selectorFor(element), reason: 'action sans nom accessible' });
    });

    document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((element) => {
      if (!visible(element) || element.type === 'hidden') return;
      const labelledBy = element.getAttribute('aria-labelledby');
      const hasLabel = Boolean(
        element.getAttribute('aria-label')
        || labelledBy
        || (element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`))
        || element.closest('label'),
      );
      if (!hasLabel) result.push({ selector: selectorFor(element), reason: 'champ sans libellé accessible' });
    });

    return result;
  });

  expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);

  if (options.checkShellTouchTargets) {
    const undersizedTargets = await page.evaluate(() => {
      const selectors = [
        'header a[href]',
        'header button',
        'nav[aria-label="Navigation mobile"] a[href]',
      ];
      return Array.from(document.querySelectorAll<HTMLElement>(selectors.join(',')))
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none'
            && style.visibility !== 'hidden'
            && rect.width > 0
            && rect.height > 0
            && (rect.width < 44 || rect.height < 44);
        })
        .map((element) => ({
          label: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? element.tagName,
          width: Math.round(element.getBoundingClientRect().width),
          height: Math.round(element.getBoundingClientRect().height),
        }));
    });

    expect(undersizedTargets, JSON.stringify(undersizedTargets, null, 2)).toEqual([]);
  }
}
