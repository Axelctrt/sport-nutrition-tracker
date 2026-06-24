import {
  openFoodFactsBarcodeSearchSchema,
  openFoodFactsTextSearchSchema,
} from '@/features/open-food-facts/schemas/openFoodFactsSearchSchema';

describe('openFoodFactsTextSearchSchema', () => {
  it('normalise une recherche textuelle valide', () => {
    expect(openFoodFactsTextSearchSchema.parse({ query: '  yaourt grec  ' })).toEqual({
      query: 'yaourt grec',
    });
  });

  it('refuse une recherche trop courte', () => {
    expect(openFoodFactsTextSearchSchema.safeParse({ query: 'a' }).success).toBe(false);
  });
});

describe('openFoodFactsBarcodeSearchSchema', () => {
  it('normalise un UPC sur 13 chiffres', () => {
    expect(
      openFoodFactsBarcodeSearchSchema.parse({ barcode: '034000470693' }),
    ).toEqual({ barcode: '0034000470693' });
  });

  it('refuse les caractères non numériques', () => {
    expect(
      openFoodFactsBarcodeSearchSchema.safeParse({ barcode: 'ABC123' }).success,
    ).toBe(false);
  });
});
