import { describe, expect, it } from 'vitest';
import {
  roundCalories,
  roundMacroGrams,
  roundToIncrement,
  roundUpToIncrement,
} from '@/domain/calculations/rounding';

 describe('arrondis métier', () => {
  it('arrondit les calories au multiple de 10 le plus proche', () => {
    expect(roundCalories(2_054)).toBe(2_050);
    expect(roundCalories(2_055)).toBe(2_060);
  });

  it('arrondit les macronutriments au multiple de 5 le plus proche', () => {
    expect(roundMacroGrams(127)).toBe(125);
    expect(roundMacroGrams(128)).toBe(130);
  });

  it('peut arrondir vers le haut pour protéger un plancher', () => {
    expect(roundUpToIncrement(1_813.625, 10)).toBe(1_820);
  });

  it('refuse un incrément nul', () => {
    expect(() => roundToIncrement(100, 0)).toThrow('strictement positif');
  });
});
