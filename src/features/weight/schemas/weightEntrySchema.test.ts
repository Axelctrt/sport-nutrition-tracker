import { describe, expect, it } from 'vitest';
import { weightEntryFormSchema } from '@/features/weight/schemas/weightEntrySchema';

describe('weightEntryFormSchema', () => {
  it('valide une pesée quotidienne', () => {
    expect(weightEntryFormSchema.safeParse({
      date: '2026-06-23',
      weightKg: 60.4,
      note: '',
    }).success).toBe(true);
  });

  it('refuse une date impossible et un poids hors limites', () => {
    expect(weightEntryFormSchema.safeParse({
      date: '2026-02-31',
      weightKg: 10,
      note: '',
    }).success).toBe(false);
  });
});
