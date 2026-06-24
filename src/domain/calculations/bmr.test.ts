import { describe, expect, it } from 'vitest';
import { calculateMifflinStJeor } from '@/domain/calculations/bmr';
import { calculateOccupationalBaseCalories } from '@/domain/calculations/occupationalActivity';

 describe('métabolisme et activité professionnelle', () => {
  it('applique Mifflin–St Jeor pour un homme', () => {
    expect(calculateMifflinStJeor({
      sex: 'male',
      weightKg: 70,
      heightCm: 175,
      ageYears: 30,
    })).toBe(1_648.75);
  });

  it('applique Mifflin–St Jeor pour une femme', () => {
    expect(calculateMifflinStJeor({
      sex: 'female',
      weightKg: 70,
      heightCm: 175,
      ageYears: 30,
    })).toBe(1_482.75);
  });

  it('applique le coefficient professionnel sans arrondi prématuré', () => {
    expect(calculateOccupationalBaseCalories(1_600, 'sedentary')).toBe(1_920);
    expect(calculateOccupationalBaseCalories(1_600, 'veryActive')).toBe(2_320);
  });

  it('refuse un poids nul', () => {
    expect(() => calculateMifflinStJeor({
      sex: 'male',
      weightKg: 0,
      heightCm: 175,
      ageYears: 30,
    })).toThrow('strictement positif');
  });
});
