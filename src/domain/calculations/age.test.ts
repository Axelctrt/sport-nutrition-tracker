import { describe, expect, it } from 'vitest';
import { calculateAgeYears } from '@/domain/calculations/age';

 describe('calculateAgeYears', () => {
  it('calcule l’âge révolu depuis une date de naissance', () => {
    expect(calculateAgeYears(
      { mode: 'birthDate', birthDate: '2000-06-24' },
      '2026-06-23',
    )).toBe(25);

    expect(calculateAgeYears(
      { mode: 'birthDate', birthDate: '2000-06-24' },
      '2026-06-24',
    )).toBe(26);
  });

  it('fait évoluer un âge saisi à partir de sa date d’enregistrement', () => {
    expect(calculateAgeYears(
      { mode: 'age', ageYears: 30, recordedOn: '2026-06-23' },
      '2027-06-22',
    )).toBe(30);

    expect(calculateAgeYears(
      { mode: 'age', ageYears: 30, recordedOn: '2026-06-23' },
      '2027-06-23',
    )).toBe(31);
  });

  it('refuse une date impossible', () => {
    expect(() => calculateAgeYears(
      { mode: 'birthDate', birthDate: '2000-02-30' },
      '2026-06-23',
    )).toThrow('date valide');
  });

  it('refuse une date de calcul antérieure à la naissance', () => {
    expect(() => calculateAgeYears(
      { mode: 'birthDate', birthDate: '2000-06-23' },
      '1999-06-23',
    )).toThrow('précéder la date de naissance');
  });
});
