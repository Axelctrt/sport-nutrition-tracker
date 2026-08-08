import { describe, expect, it } from 'vitest';

import hubSource from '@/features/sport/components/SportHubOverview.tsx?raw';
import navigationCardSource from '@/features/sport/components/SportNavigationCard.tsx?raw';
import startSheetSource from '@/features/sport/components/SportStartSheet.tsx?raw';

describe('convergence visuelle du hub Sport', () => {
  it('centralise les cartes de navigation Sport sur Card interactive', () => {
    expect(navigationCardSource).toContain('variant="interactive"');
    expect(navigationCardSource).toContain('var(--sp-text-primary)');
    expect(navigationCardSource).toContain('var(--sp-surface-muted)');
    expect(navigationCardSource).toContain('var(--sp-accent-primary)');
    expect(hubSource).toContain('SportNavigationCard');
    expect(startSheetSource).toContain('SportNavigationCard');
  });

  it('réutilise le contrat bouton et les tokens sémantiques', () => {
    expect(hubSource).toContain('className="sp-button');
    expect(startSheetSource).toContain('sp-button sp-button--secondary');
    expect(hubSource).not.toContain('bg-brand-700');
    expect(startSheetSource).not.toContain('border-slate-200 bg-white');
  });
});
