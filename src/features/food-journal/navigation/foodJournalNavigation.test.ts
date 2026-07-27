import {
  createFoodJournalFeedbackState,
  createFoodJournalRestoreState,
  createFoodJournalReturnState,
  foodJournalCancelPath,
} from '@/features/food-journal/navigation/foodJournalNavigation';

describe('navigation du journal alimentaire', () => {
  it('mémorise la date, le repas et la position du journal', () => {
    expect(createFoodJournalReturnState(
      '/food?date=2026-07-12',
      'food-journal-location-key',
      'dinner',
    )).toEqual({
      foodJournalReturn: {
        path: '/food?date=2026-07-12',
        scrollKey: 'food-journal-location-key',
        mealSlot: 'dinner',
      },
    });
  });

  it('restaure la position et transporte la confirmation après enregistrement', () => {
    const context = createFoodJournalReturnState(
      '/food?date=2026-07-12',
      'food-journal-location-key',
      'lunch',
    ).foodJournalReturn;

    expect(createFoodJournalFeedbackState(context, {
      title: 'Aliment ajouté au déjeuner',
      mealSlot: 'lunch',
      entryId: 'entry-1',
    })).toEqual({
      foodJournalFeedback: {
        title: 'Aliment ajouté au déjeuner',
        mealSlot: 'lunch',
        entryId: 'entry-1',
      },
      scroll: 'restore',
      restoreScrollKey: 'food-journal-location-key',
    });

    expect(createFoodJournalRestoreState(context)).toEqual({
      scroll: 'restore',
      restoreScrollKey: 'food-journal-location-key',
    });
  });

  it('ne fabrique pas un état de restauration sans contexte', () => {
    expect(createFoodJournalRestoreState(undefined)).toBeUndefined();
  });

  it('revient aux methodes d ajout lorsqu elles font partie du contexte', () => {
    const context = createFoodJournalReturnState(
      '/',
      'dashboard-nutrition',
      'dinner',
      '/?panel=meal-add&slot=dinner&step=method',
    ).foodJournalReturn;

    expect(foodJournalCancelPath(context, '/food?date=2026-07-12')).toBe(
      '/?panel=meal-add&slot=dinner&step=method',
    );
  });
});
