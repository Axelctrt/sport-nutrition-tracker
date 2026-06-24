import { describe, expect, it } from 'vitest';
import {
  calculateRunningCalories,
  calculateRunningPaceSecondsPerKm,
  calculateRunningSteps,
  formatPace,
} from '@/domain/calculations/running';

 describe('calculs de course', () => {
  it('calcule les pas de course à partir de la durée et de la cadence', () => {
    expect(calculateRunningSteps(60, 170)).toBe(10_200);
  });

  it('arrondit les pas au nombre entier le plus proche', () => {
    expect(calculateRunningSteps(42.5, 171)).toBe(7_268);
  });

  it('calcule les calories selon le poids, la distance et le coefficient', () => {
    expect(calculateRunningCalories(70, 10, 1)).toBe(700);
    expect(calculateRunningCalories(70, 10, 0.95)).toBe(665);
  });

  it('calcule et formate l’allure en min/km', () => {
    const pace = calculateRunningPaceSecondsPerKm(52.5, 10);

    expect(pace).toBe(315);
    expect(formatPace(pace)).toBe('5:15');
  });

  it('refuse une distance nulle pour l’allure', () => {
    expect(() => calculateRunningPaceSecondsPerKm(50, 0)).toThrow(
      'strictement positif',
    );
  });
});
