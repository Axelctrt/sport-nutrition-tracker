import { describe, expect, it } from 'vitest';

import appLayoutSource from '@/app/layouts/AppLayout.tsx?raw';
import pageHeaderSource from '@/app/layouts/PageHeader.tsx?raw';
import navigationCardSource from '@/features/settings/components/SettingsNavigationCard.tsx?raw';
import pageIntroSource from '@/features/settings/components/SettingsPageIntro.tsx?raw';
import sectionDirectorySource from '@/features/settings/components/SettingsSectionDirectory.tsx?raw';
import advancedPageSource from '@/features/settings/pages/AdvancedSettingsPage.tsx?raw';
import categoryPageSource from '@/features/settings/pages/SettingsCategoryPage.tsx?raw';
import homePageSource from '@/features/settings/pages/SettingsHomePage.tsx?raw';

const legacyHeader = 'rounded-3xl border border-slate-200 bg-white';

describe('convergence visuelle Shell et Paramètres', () => {
  it('préserve le Shell centralisé', () => {
    expect(appLayoutSource).toContain('sport-theme-app');
    expect(pageHeaderSource).toContain('sp-navigation-shell');
  });

  it('centralise les en-têtes Paramètres', () => {
    expect(pageIntroSource).toContain('variant="elevated"');
    expect(pageIntroSource).toContain('var(--sp-text-primary)');
    for (const source of [homePageSource, categoryPageSource, advancedPageSource]) {
      expect(source).toContain('SettingsPageIntro');
      expect(source).not.toContain(legacyHeader);
    }
  });

  it('utilise les surfaces et tokens partagés', () => {
    expect(navigationCardSource).toContain('variant="interactive"');
    expect(navigationCardSource).toContain('var(--sp-accent-primary)');
    expect(navigationCardSource).toContain('var(--sp-warning)');
    expect(sectionDirectorySource).toContain('variant="interactive"');
    expect(advancedPageSource).toContain('variant="muted"');
    expect(advancedPageSource).toContain('<IconAction');
    expect(advancedPageSource).toContain('className="sp-button');
    expect(advancedPageSource).not.toContain('bg-brand-600');
  });
});
