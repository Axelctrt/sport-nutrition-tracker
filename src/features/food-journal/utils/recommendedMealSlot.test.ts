import { describe, expect, it } from 'vitest';
import { recommendedMealSlot } from '@/features/food-journal/utils/recommendedMealSlot';

describe('recommendedMealSlot', () => {
  it.each([
    [8, {}, 'breakfast'],
    [12, {}, 'lunch'],
    [20, {}, 'dinner'],
  ] as const)('propose le repas cohérent à %i h pour une journée vide', (hour, counts, expected) => {
    expect(recommendedMealSlot(hour, counts)).toBe(expected);
  });

  it('préfère le dîner le soir même lorsque le petit-déjeuner est vide', () => {
    expect(recommendedMealSlot(20, {
      breakfast: 0,
      lunch: 2,
      dinner: 0,
    })).toBe('dinner');
  });

  it('propose le prochain repas principal vide lorsque celui de l’heure est renseigné', () => {
    expect(recommendedMealSlot(12, {
      breakfast: 1,
      lunch: 2,
      dinner: 0,
    })).toBe('dinner');
  });

  it('propose une collation lorsque les trois repas principaux sont renseignés', () => {
    expect(recommendedMealSlot(16, {
      breakfast: 1,
      lunch: 1,
      dinner: 1,
      snacks: 0,
    })).toBe('snacks');
  });
});
