import { describe, expect, it } from 'vitest';
import { calculateMetCalories } from '@/domain/calculations/met';
import { calculateSwimmingPaceSecondsPer100Meters } from '@/domain/calculations/swimming';
import { formatPace } from '@/domain/calculations/running';

 describe('calculs MET et natation', () => {
  it('calcule une dépense MET', () => {
    expect(calculateMetCalories(60, 5, 70)).toBe(367.5);
  });

  it('retourne zéro pour une activité de durée nulle', () => {
    expect(calculateMetCalories(0, 8, 70)).toBe(0);
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
