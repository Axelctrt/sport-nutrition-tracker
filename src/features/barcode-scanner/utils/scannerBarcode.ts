import { sanitizeBarcode } from '@/infrastructure/open-food-facts/barcode';

export type FoodBarcodeFormat = 'EAN-13' | 'EAN-8 / UPC-E' | 'UPC-A';

export interface ValidatedFoodBarcode {
  code: string;
  format: FoodBarcodeFormat;
}

export function validateFoodBarcode(value: string): ValidatedFoodBarcode | undefined {
  const code = sanitizeBarcode(value);
  if (!/^\d+$/.test(code)) return undefined;

  if (code.length === 13) return { code, format: 'EAN-13' };
  if (code.length === 12) return { code, format: 'UPC-A' };
  if (code.length >= 6 && code.length <= 8) return { code, format: 'EAN-8 / UPC-E' };
  return undefined;
}
