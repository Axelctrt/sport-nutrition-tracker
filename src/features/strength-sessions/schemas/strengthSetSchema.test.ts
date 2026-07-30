import { strengthSetFormSchema } from '@/features/strength-sessions/schemas/strengthSetSchema';

describe('strengthSetFormSchema', () => {
  it('valide une série de travail complète', () => {
    const result = strengthSetFormSchema.safeParse({
      repetitions: '12',
      weightKg: '60.5',
      rpe: '8.5',
      type: 'working',
      notes: 'Bonne exécution',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        repetitions: 12,
        weightKg: 60.5,
        rpe: 8.5,
        type: 'working',
        notes: 'Bonne exécution',
      });
    }
  });

  it('accepte un RPE vide', () => {
    const result = strengthSetFormSchema.safeParse({
      repetitions: 10,
      weightKg: 0,
      rpe: '',
      type: 'warmup',
      notes: '',
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.rpe).toBeUndefined();
  });

  it('ne convertit pas un champ obligatoire vide en zéro', () => {
    const result = strengthSetFormSchema.safeParse({
      repetitions: '',
      weightKg: '',
      rpe: '',
      type: 'working',
      notes: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0]))
        .toEqual(expect.arrayContaining(['repetitions', 'weightKg']));
    }
  });

  it('refuse un RPE hors limites ou avec un pas invalide', () => {
    expect(strengthSetFormSchema.safeParse({ repetitions: 10, weightKg: 50, rpe: 11, type: 'working' }).success).toBe(false);
    expect(strengthSetFormSchema.safeParse({ repetitions: 10, weightKg: 50, rpe: 8.3, type: 'working' }).success).toBe(false);
  });
});
