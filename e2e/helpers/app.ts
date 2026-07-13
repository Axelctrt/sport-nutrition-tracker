import { expect, type Page } from '@playwright/test';

export async function createLocalProfile(page: Page, firstName = 'E2E'): Promise<void> {
  const modeChoiceHeading = page.getByRole('heading', {
    name: 'Local ou compte ?',
  });

  await page.goto('/#/onboarding', { waitUntil: 'domcontentloaded' });

  try {
    await expect(modeChoiceHeading).toBeVisible({ timeout: 15_000 });
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(modeChoiceHeading).toBeVisible({ timeout: 20_000 });
  }
  await page.getByRole('button', { name: 'Choisir le mode local' }).click();
  await expect(page.getByRole('heading', {
    name: 'Comment vous appeler ?',
  })).toBeVisible();
  await page.getByLabel(/Nom affiché/).fill(firstName);

  const profileStepHeadings = [
    'Quel sexe utiliser pour les calculs ?',
    'Votre date de naissance',
    'Votre taille',
    'Votre poids actuel',
    'Votre objectif',
    'Votre activité quotidienne',
    'Votre objectif de pas',
  ];

  for (const heading of profileStepHeadings) {
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: 'Vérifiez votre profil' })).toBeVisible();
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
