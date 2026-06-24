export function sanitizeBarcode(value: string): string {
  return value.replace(/[\s-]/g, '');
}

export function normalizeOpenFoodFactsBarcode(value: string): string {
  const sanitized = sanitizeBarcode(value);
  if (!/^\d{1,14}$/.test(sanitized)) return sanitized;

  const withoutLeadingZeros = sanitized.replace(/^0+/, '') || '0';
  const significantLength = withoutLeadingZeros.length;

  if (significantLength <= 7) {
    return withoutLeadingZeros.padStart(8, '0');
  }

  if (significantLength >= 9 && significantLength <= 12) {
    return withoutLeadingZeros.padStart(13, '0');
  }

  return sanitized;
}

export function isSupportedBarcode(value: string): boolean {
  const sanitized = sanitizeBarcode(value);
  return /^\d{4,14}$/.test(sanitized);
}
