import {
  createFoodLibraryFeedbackState,
  createFoodLibraryRestoreState,
  createFoodLibraryReturnState,
} from '@/features/food-library/navigation/foodLibraryNavigation';

describe('navigation de la bibliothèque alimentaire', () => {
  it('mémorise la page et la position à restaurer', () => {
    expect(createFoodLibraryReturnState('/food/products?q=lait', 'location-key', 'products')).toEqual({
      foodLibraryReturn: {
        path: '/food/products?q=lait',
        scrollKey: 'location-key',
        section: 'products',
      },
    });
  });

  it('restaure le scroll et transporte la confirmation', () => {
    const context = createFoodLibraryReturnState('/recipes', 'recipes-key', 'recipes').foodLibraryReturn;

    expect(createFoodLibraryFeedbackState(context, {
      title: 'Recette enregistrée',
      itemId: 'recipe-1',
    })).toEqual({
      foodLibraryFeedback: {
        title: 'Recette enregistrée',
        itemId: 'recipe-1',
      },
      scroll: 'restore',
      restoreScrollKey: 'recipes-key',
    });
    expect(createFoodLibraryRestoreState(context)).toEqual({
      scroll: 'restore',
      restoreScrollKey: 'recipes-key',
    });
  });
});
