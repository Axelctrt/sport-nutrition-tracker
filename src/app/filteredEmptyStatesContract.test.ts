import { describe, expect, it } from 'vitest';

import globalSearchPageSource from '@/features/global-search/pages/GlobalSearchPage.tsx?raw';
import goalsPageSource from '@/features/goals/pages/GoalsPage.tsx?raw';
import strengthExercisesPageSource from '@/features/strength-exercises/pages/StrengthExercisesPage.tsx?raw';
import emptyStateSource from '@/shared/ui/EmptyState.tsx?raw';

describe('cohérence V1 — états filtrés', () => {
  it('conserve le contrat canonique des variantes EmptyState', () => {
    expect(emptyStateSource).toContain(
      "'first-use' | 'filtered' | 'completed' | 'unavailable'",
    );
    expect(emptyStateSource).toContain("variant = 'first-use'");
    expect(emptyStateSource).toContain('data-empty-state-variant={variant}');
  });

  it('distingue explicitement premier usage et filtre vide sur Objectifs et Exercices', () => {
    expect(goalsPageSource).toContain(
      "variant={isFirstUse ? 'first-use' : 'filtered'}",
    );
    expect(goalsPageSource).toContain('Afficher tous les objectifs');

    expect(strengthExercisesPageSource).toContain(
      "variant={isFirstUse ? 'first-use' : 'filtered'}",
    );
    expect(strengthExercisesPageSource).toContain('allExercises.length === 0');
    expect(strengthExercisesPageSource).toContain('Afficher tous les exercices');
  });

  it('rend la Recherche globale explicitement filtrée et réinitialisable', () => {
    expect(globalSearchPageSource).toContain('variant="filtered"');
    expect(globalSearchPageSource).toContain('Afficher tous les résultats');
    expect(globalSearchPageSource).toContain('Réinitialiser la recherche');
  });
});
