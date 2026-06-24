import {
  newFoodProductForMealPath,
  selectFoodPath,
} from '@/app/routePaths';

describe('parcours de sélection alimentaire', () => {
  it('conserve la date, le repas et le produit présélectionné', () => {
    expect(selectFoodPath('2026-06-24', 'breakfast', 'product-1')).toBe(
      '/food/select?date=2026-06-24&slot=breakfast&productId=product-1',
    );
  });

  it('transmet le contexte du repas au formulaire de création manuelle', () => {
    expect(newFoodProductForMealPath('2026-06-24', 'dinner')).toBe(
      '/food/products/new?returnDate=2026-06-24&returnSlot=dinner',
    );
  });
});
