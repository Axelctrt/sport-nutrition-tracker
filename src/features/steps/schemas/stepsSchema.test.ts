import { describe, expect, it } from 'vitest';
import { stepsFormSchema } from '@/features/steps/schemas/stepsSchema';

describe('stepsFormSchema', () => {
  it('accepte un nombre de pas quotidien', () => {
    expect(stepsFormSchema.safeParse({ totalSteps: 12_345 }).success).toBe(true);
  });

  it('refuse les valeurs négatives et décimales', () => {
    expect(stepsFormSchema.safeParse({ totalSteps: -1 }).success).toBe(false);
    expect(stepsFormSchema.safeParse({ totalSteps: 10.5 }).success).toBe(false);
  });
});
