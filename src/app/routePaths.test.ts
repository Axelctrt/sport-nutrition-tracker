import {
  barcodeScannerPath,
  newFoodProductForMealPath,
  selectFoodPath,
  editStrengthExercisePath,
  editWorkoutTemplatePath,
  workoutSessionPath,
  strengthExerciseHistoryPath,
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
