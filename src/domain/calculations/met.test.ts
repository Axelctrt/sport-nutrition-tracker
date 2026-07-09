import { describe, expect, it } from 'vitest';
import {
  calculateGrossMetCalories,
  calculateNetMetCalories,
} from '@/domain/calculations/met';
import { calculateSwimmingPaceSecondsPer100Meters } from '@/domain/calculations/swimming';
import { formatPace } from '@/domain/calculations/running';

describe('calculs MET et natation', () => {
  it('conserve la formule MET brute pour expliquer les anciens snapshots', () => {
    expect(calculateGrossMetCalories(60, 5, 70)).toBe(367.5);
  });

  it('calcule la dépense MET nette en retirant le repos déjà inclus', () => {
    expect(calculateNetMetCalories(60, 5, 70)).toBe(294);
  });

  it('ne produit jamais une dépense nette négative', () => {
    expect(calculateNetMetCalories(60, 0.5, 70)).toBe(0);
  });

  it('retourne zéro pour une activité de durée nulle', () => {
    expect(calculateNetMetCalories(0, 8, 70)).toBe(0);
  });

  it('calcule l’allure de natation en min/100 m', () => {
    const pace = calculateSwimmingPaceSecondsPer100Meters(40, 2_000);

    expect(pace).toBe(120);
    expect(formatPace(pace)).toBe('2:00');
  });

  it('refuse une distance de natation nulle', () => {
    expect(() => calculateSwimmingPaceSecondsPer100Meters(40, 0)).toThrow(
      'strictement positif',
    );
  });
});
