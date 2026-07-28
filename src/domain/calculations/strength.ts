export function calculateEstimatedOneRepMax(
  weightKg: number,
  repetitions: number,
): number | undefined {
  if (weightKg <= 0 || repetitions <= 0 || repetitions > 12) return undefined;
  if (repetitions === 1) return weightKg;
  return Math.round(weightKg * (1 + repetitions / 30) * 10) / 10;
}
