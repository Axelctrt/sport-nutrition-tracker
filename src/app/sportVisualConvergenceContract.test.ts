import { describe, expect, it } from 'vitest';

import enduranceTemplatesSource from '@/features/endurance-templates/pages/EnduranceTemplatesPage.tsx?raw';
import strengthExercisesSource from '@/features/strength-exercises/pages/StrengthExercisesPage.tsx?raw';
import workoutTemplatesSource from '@/features/strength-templates/pages/WorkoutTemplatesPage.tsx?raw';
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

describe('convergence visuelle des bibliothèques et modèles Sport', () => {
  it('aligne les CTA du catalogue d’exercices sur le contrat bouton sans changer les routes', () => {
    expect(strengthExercisesSource).toContain('className="sp-button inline-flex min-h-[var(--sp-control-height-lg)]');
    expect(strengthExercisesSource).toContain('sp-button sp-button--secondary');
    expect(strengthExercisesSource).toContain('to={routePaths.newStrengthExercise}');
    expect(strengthExercisesSource).not.toContain('bg-brand-700');
  });

  it('aligne les CTA des séances modèles sur les variantes primaire et secondaire', () => {
    expect(workoutTemplatesSource).toContain('sp-button sp-button--secondary');
    expect(workoutTemplatesSource).toContain('sp-button min-h-[var(--sp-control-height-lg)]');
    expect(workoutTemplatesSource).toContain('to={routePaths.weeklyPlanning}');
    expect(workoutTemplatesSource).not.toContain('border border-slate-300 bg-white');
    expect(workoutTemplatesSource).not.toContain('bg-brand-700');
  });

  it('aligne le CTA Utiliser des modèles d’endurance sans toucher à sa destination', () => {
    expect(enduranceTemplatesSource).toContain('className="sp-button inline-flex min-h-[var(--sp-control-height-sm)]');
    expect(enduranceTemplatesSource).toContain('to={startPath(template)}');
    expect(enduranceTemplatesSource).not.toContain('bg-brand-700');
  });
});
