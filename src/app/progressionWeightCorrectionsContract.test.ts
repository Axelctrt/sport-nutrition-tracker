import { describe, expect, it } from 'vitest';

import checkInSource from '@/features/dashboard/components/DailyCheckInSheet.tsx?raw';
import progressionHubSource from '@/features/progression/pages/ProgressionHubPage.tsx?raw';

describe('correctifs ciblés progression et check-in', () => {
  it('aligne le rayon du CTA Ajouter une pesée sur le contrôle partagé', () => {
    expect(progressionHubSource).toContain('to={routePaths.weight}');
    expect(progressionHubSource).toContain('Ajouter une pesée');
    expect(progressionHubSource).toContain('rounded-[var(--sp-radius-control)]');
  });

  it('arrondit seulement le fallback du check-in sans toucher au calcul de référence', () => {
    expect(checkInSource).toContain('function formatFallbackWeightKg(weightKg: number): string');
    expect(checkInSource).toContain('return weightKg.toFixed(1)');
    expect(checkInSource).toContain('? String(weightEntry.weightKg)');
    expect(checkInSource).toContain(': formatFallbackWeightKg(fallbackWeightKg)');
  });
});
