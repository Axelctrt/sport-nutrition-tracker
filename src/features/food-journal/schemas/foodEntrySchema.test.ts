import {
  copyDayFormSchema,
  copyMealFormSchema,
  foodEntryFormSchema,
} from '@/features/food-journal/schemas/foodEntrySchema';

describe('foodEntryFormSchema', () => {
  it('valide une quantité en grammes', () => {
    expect(
      foodEntryFormSchema.safeParse({
        date: '2026-06-23',
        mealSlot: 'lunch',
        productId: 'product-1',
        inputMode: 'amount',
        inputQuantity: 150,
      }).success,
    ).toBe(true);
  });

  it('refuse une quantité nulle', () => {
    expect(
      foodEntryFormSchema.safeParse({
        date: '2026-06-23',
        mealSlot: 'lunch',
        productId: 'product-1',
        inputMode: 'amount',
        inputQuantity: 0,
      }).success,
    ).toBe(false);
  });

  it('valide les formulaires de copie', () => {
    expect(copyMealFormSchema.safeParse({ targetDate: '2026-06-24', targetSlot: 'dinner' }).success).toBe(true);
    expect(copyDayFormSchema.safeParse({ targetDate: '2026-06-24' }).success).toBe(true);
  });
});
