import { validateFoodBarcode } from '@/features/barcode-scanner/utils/scannerBarcode';

describe('validateFoodBarcode', () => {
  it('accepte et normalise un EAN-13', () => {
    expect(validateFoodBarcode('3017 6240-10701')).toEqual({
      code: '3017624010701',
      format: 'EAN-13',
    });
  });

  it('reconnaît un UPC-A', () => {
    expect(validateFoodBarcode('012345678905')).toEqual({
      code: '012345678905',
      format: 'UPC-A',
    });
  });

  it('accepte les longueurs EAN-8 et UPC-E', () => {
    expect(validateFoodBarcode('12345670')).toEqual({
      code: '12345670',
      format: 'EAN-8 / UPC-E',
    });
    expect(validateFoodBarcode('123456')).toEqual({
      code: '123456',
      format: 'EAN-8 / UPC-E',
    });
  });

  it('refuse les valeurs non numériques ou de mauvaise longueur', () => {
    expect(validateFoodBarcode('ABC123')).toBeUndefined();
    expect(validateFoodBarcode('12345')).toBeUndefined();
    expect(validateFoodBarcode('123456789')).toBeUndefined();
  });
});
