import { describe, expect, it } from 'vitest';

import settingsCategoryDirectorySource from '@/features/settings/components/SettingsCategoryDirectory.tsx?raw';
import settingsSectionDirectorySource from '@/features/settings/components/SettingsSectionDirectory.tsx?raw';
import globalSearchPageSource from '@/features/global-search/pages/GlobalSearchPage.tsx?raw';
import goalsPageSource from '@/features/goals/pages/GoalsPage.tsx?raw';
import strengthExercisesPageSource from '@/features/strength-exercises/pages/StrengthExercisesPage.tsx?raw';
import trashPageSource from '@/features/trash/pages/TrashPage.tsx?raw';
import buttonSource from '@/shared/ui/Button.tsx?raw';
import emptyStateSource from '@/shared/ui/EmptyState.tsx?raw';

describe('cohérence V1 — états filtrés', () => {
  it('conserve le contrat canonique des variantes EmptyState', () => {
    expect(emptyStateSource).toContain(
      "'first-use' | 'filtered' | 'completed' | 'unavailable'",
    );
    expect(emptyStateSource).toContain("variant = 'first-use'");
    expect(emptyStateSource).toContain('data-empty-state-variant={variant}');
    expect(emptyStateSource).toContain(
      'mt-5 flex flex-col justify-center gap-2 sm:flex-row',
    );
    expect(buttonSource).toContain(
      'min-h-[var(--sp-control-height-md)]',
    );
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

  it('couvre les états filtrés résiduels sans faux reset sur un annuaire vide', () => {
    for (const directorySource of [
      settingsCategoryDirectorySource,
      settingsSectionDirectorySource,
    ]) {
      expect(directorySource).toContain("? 'unavailable' : 'filtered'");
      expect(directorySource).toContain(
        "<Button onClick={() => setQuery('')}>Effacer la recherche</Button>",
      );
    }

    expect(trashPageSource).toContain('variant="first-use"');
    expect(trashPageSource).toContain('variant="filtered"');
    expect(trashPageSource).toContain('Réinitialiser les filtres');
    expect(trashPageSource).toContain("setTypeFilter('all')");
    expect(trashPageSource).toContain('min-w-0 overflow-x-clip');
  });
});
