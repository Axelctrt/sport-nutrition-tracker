import { z } from 'zod';
import {
  isSupportedBarcode,
  normalizeOpenFoodFactsBarcode,
} from '@/infrastructure/open-food-facts/barcode';

export const openFoodFactsTextSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, 'Saisis au moins 2 caractères.')
    .max(100, 'La recherche ne peut pas dépasser 100 caractères.'),
});

export const openFoodFactsBarcodeSearchSchema = z.object({
  barcode: z
    .string()
    .trim()
    .refine(isSupportedBarcode, 'Saisis un code-barres de 4 à 14 chiffres.')
    .transform(normalizeOpenFoodFactsBarcode),
});

export type OpenFoodFactsTextSearchValues = z.input<typeof openFoodFactsTextSearchSchema>;
export type OpenFoodFactsBarcodeSearchValues = z.input<typeof openFoodFactsBarcodeSearchSchema>;
