import {
  routePaths,
  barcodeScannerPath,
  newFoodProductForMealPath,
  selectFoodPath,
  editActivityPath,
  editRecipePath,
  editStrengthExercisePath,
  editWorkoutTemplatePath,
  workoutSessionPath,
  strengthExerciseHistoryPath,
  weightPath,
} from '@/app/routePaths';

describe('parcours de sélection alimentaire', () => {
  it('conserve la date, le repas et le produit présélectionné', () => {
    expect(selectFoodPath('2026-06-24', 'breakfast', 'product-1')).toBe(
      '/food/select?date=2026-06-24&slot=breakfast&productId=product-1',
    );
  });

  it('conserve le contexte du repas pour le scanner', () => {
    expect(barcodeScannerPath('2026-06-24', 'snacks')).toBe(
      '/food/barcode-scanner?date=2026-06-24&slot=snacks',
    );
  });

  it('transmet le contexte du repas au formulaire de création manuelle', () => {
    expect(newFoodProductForMealPath('2026-06-24', 'dinner')).toBe(
      '/food/products/new?returnDate=2026-06-24&returnSlot=dinner',
    );
  });

  it('conserve le code-barres pour la création manuelle après un scan inconnu', () => {
    expect(newFoodProductForMealPath('2026-06-24', 'lunch', '3017624010701')).toBe(
      '/food/products/new?returnDate=2026-06-24&returnSlot=lunch&barcode=3017624010701',
    );
  });

  it('ouvre directement la recherche Open Food Facts depuis un échec de scan', () => {
    expect(selectFoodPath('2026-06-24', 'lunch', undefined, 'openFoodFacts')).toBe(
      '/food/select?date=2026-06-24&slot=lunch&source=openFoodFacts',
    );
  });
});


describe('parcours du catalogue de musculation', () => {
  it('construit le chemin de modification d’un exercice personnel', () => {
    expect(editStrengthExercisePath('exercise-1')).toBe('/strength/exercises/exercise-1/edit');
  });
});


describe('parcours des séances modèles', () => {
  it('construit le chemin de modification d’une séance', () => {
    expect(editWorkoutTemplatePath('template-1')).toBe('/strength/templates/template-1/edit');
  });
});


describe('parcours de la planification hebdomadaire', () => {
  it('utilise une route stable dédiée au planning', () => {
    expect(routePaths.weeklyPlanning).toBe('/strength/planning');
  });
});

describe('personnalisation du tableau de bord', () => {
  it('utilise une route stable dédiée à l’affichage', () => {
    expect(routePaths.dashboardCustomization).toBe('/settings/dashboard');
  });
});

describe('parcours des modèles d’endurance', () => {
  it('utilise une route stable dédiée aux modèles', () => {
    expect(routePaths.enduranceTemplates).toBe('/activities/templates');
  });
});

describe('parcours des séances réalisées', () => {
  it('construit le chemin d’une séance en cours ou historique', () => {
    expect(workoutSessionPath('session-1')).toBe('/strength/sessions/session-1');
  });
});


describe('parcours de l’historique de musculation', () => {
  it('construit le chemin de l’historique d’un exercice', () => {
    expect(strengthExerciseHistoryPath('exercise-1')).toBe('/strength/exercises/exercise-1/history');
  });
});


describe('parcours du suivi du poids', () => {
  it('ouvre la pesée de la date demandée', () => {
    expect(weightPath('2026-06-25')).toBe('/weight?date=2026-06-25');
  });
});

describe('parcours des éditeurs dynamiques', () => {
  it('encode les identifiants dans les chemins de recette et d’activité', () => {
    expect(editRecipePath('recette spéciale')).toBe('/recipes/recette%20sp%C3%A9ciale/edit');
    expect(editActivityPath('activité/1')).toBe('/activities/activit%C3%A9%2F1/edit');
  });
});

describe('centre de récompenses', () => {
  it('utilise une route stable dédiée', () => {
    expect(routePaths.rewards).toBe('/rewards');
  });
});
describe('corbeille locale', () => {
  it('utilise une route stable dédiée', () => {
    expect(routePaths.trash).toBe('/backup/trash');
  });
});
describe('prototype de synchronisation', () => {
  it('utilise une route technique stable hors navigation normale', () => {
    expect(routePaths.syncPrototype).toBe('/settings/sync-prototype');
  });
});

describe('compte et appareils', () => {
  it('utilise une route stable dédiée à la gestion locale du compte', () => {
    expect(routePaths.accountDevices).toBe('/settings/account-devices');
  });
});

describe('page de confidentialité', () => {
  it('utilise une route publique stable', () => {
    expect(routePaths.privacy).toBe('/privacy');
  });
});
