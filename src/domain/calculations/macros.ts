import { roundMacroGrams } from '@/domain/calculations/rounding';
import {
  assertNonNegativeNumber,
  assertPositiveNumber,
} from '@/domain/calculations/validation';
import type { DailyMacroTargets } from '@/domain/models/targets';

export interface MacroTargetsInput {
  targetCaloriesKcal: number;
  weightKg: number;
  proteinGramsPerKg: number;
  fatGramsPerKg: number;
}

export interface MacroTargetsResult {
  macros: DailyMacroTargets;
  fixedMacroCaloriesKcal: number;
  remainingCaloriesForCarbohydratesKcal: number;
  carbohydratesClampedToZero: boolean;
}

export function calculateMacroTargets({
  targetCaloriesKcal,
  weightKg,
  proteinGramsPerKg,
  fatGramsPerKg,
}: MacroTargetsInput): MacroTargetsResult {
  assertNonNegativeNumber(targetCaloriesKcal, 'targetCaloriesKcal');
  assertPositiveNumber(weightKg, 'weightKg');
  assertNonNegativeNumber(proteinGramsPerKg, 'proteinGramsPerKg');
  assertNonNegativeNumber(fatGramsPerKg, 'fatGramsPerKg');

  const proteinGrams = roundMacroGrams(weightKg * proteinGramsPerKg);
  const fatGrams = roundMacroGrams(weightKg * fatGramsPerKg);
  const fixedMacroCaloriesKcal = (proteinGrams * 4) + (fatGrams * 9);
  const remainingCaloriesForCarbohydratesKcal = Math.max(
    0,
    targetCaloriesKcal - fixedMacroCaloriesKcal,
  );
  const carbohydratesGrams = roundMacroGrams(
    remainingCaloriesForCarbohydratesKcal / 4,
  );

  return {
    macros: {
      proteinGrams,
      carbohydratesGrams,
      fatGrams,
    },
    fixedMacroCaloriesKcal,
    remainingCaloriesForCarbohydratesKcal,
    carbohydratesClampedToZero: fixedMacroCaloriesKcal > targetCaloriesKcal,
  };
}
