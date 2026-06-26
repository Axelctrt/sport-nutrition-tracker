import { describe, expect, it } from 'vitest';
import styles from '@/styles/index.css?raw';
import { inputClassName } from '@/shared/forms/formStyles';

describe('champs natifs responsives', () => {
  it('autorise les champs partagés à se réduire dans une grille ou une flexbox', () => {
    expect(inputClassName.split(' ')).toEqual(expect.arrayContaining([
      'block',
      'min-w-0',
      'w-full',
      'max-w-full',
    ]));
  });

  it('contraint les champs de date et heure à la largeur de leur conteneur sur Safari mobile', () => {
    expect(styles).toContain("input[type='date']");
    expect(styles).toContain("input[type='time']");
    expect(styles).toContain('min-inline-size: 0');
    expect(styles).toContain('max-inline-size: 100%');
    expect(styles).toContain('block-size: 2.75rem');
    expect(styles).toContain('width: -webkit-fill-available');
    expect(styles).toContain('::-webkit-date-and-time-value');
  });
});
