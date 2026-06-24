import {
  isSupportedBarcode,
  normalizeOpenFoodFactsBarcode,
  sanitizeBarcode,
} from '@/infrastructure/open-food-facts/barcode';

describe('barcode Open Food Facts', () => {
  it('retire les espaces et tirets', () => {
    expect(sanitizeBarcode('3017 6240-10701')).toBe('3017624010701');
  });

  it('normalise les codes de 9 à 12 chiffres vers 13 chiffres', () => {
    expect(normalizeOpenFoodFactsBarcode('034000470693')).toBe('0034000470693');
  });

  it('normalise les codes courts vers 8 chiffres', () => {
    expect(normalizeOpenFoodFactsBarcode('1234567')).toBe('01234567');
  });

  it('conserve les EAN-13', () => {
    expect(normalizeOpenFoodFactsBarcode('3017624010701')).toBe('3017624010701');
  });

  it('refuse un code non numérique', () => {
    expect(isSupportedBarcode('ABC123')).toBe(false);
  });
});
