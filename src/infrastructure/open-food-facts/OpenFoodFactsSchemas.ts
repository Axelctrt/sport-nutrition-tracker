import { z } from 'zod';

function optionalTextValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (Array.isArray(value)) {
    const values = value
      .map((item) => optionalTextValue(item))
      .filter((item): item is string => item !== undefined);
    return values.length > 0 ? values.join(', ') : undefined;
  }

  if (value !== null && typeof value === 'object') {
    const localized = value as Record<string, unknown>;
    for (const language of ['fr', 'fr-FR', 'en', 'en-GB', 'en-US']) {
      const text = optionalTextValue(localized[language]);
      if (text !== undefined) return text;
    }

    for (const candidate of Object.values(localized)) {
      const text = optionalTextValue(candidate);
      if (text !== undefined) return text;
    }
  }

  return undefined;
}

function optionalFiniteNumberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

const optionalFiniteNumber = z.preprocess(
  optionalFiniteNumberValue,
  z.number().finite().optional(),
);
const optionalString = z.preprocess(optionalTextValue, z.string().optional());

export const openFoodFactsNutrimentsSchema = z
  .object({
    'energy-kcal_100g': optionalFiniteNumber,
    'energy-kcal_100ml': optionalFiniteNumber,
    energy_100g: optionalFiniteNumber,
    energy_100ml: optionalFiniteNumber,
    proteins_100g: optionalFiniteNumber,
    proteins_100ml: optionalFiniteNumber,
    carbohydrates_100g: optionalFiniteNumber,
    carbohydrates_100ml: optionalFiniteNumber,
    fat_100g: optionalFiniteNumber,
    fat_100ml: optionalFiniteNumber,
    fiber_100g: optionalFiniteNumber,
    fiber_100ml: optionalFiniteNumber,
    salt_100g: optionalFiniteNumber,
    salt_100ml: optionalFiniteNumber,
  })
  .passthrough();

export const openFoodFactsRawProductSchema = z
  .object({
    code: optionalString,
    product_name: optionalString,
    product_name_fr: optionalString,
    generic_name: optionalString,
    generic_name_fr: optionalString,
    brands: optionalString,
    serving_size: optionalString,
    serving_quantity: optionalFiniteNumber,
    serving_quantity_unit: optionalString,
    nutrition_data_per: optionalString,
    product_quantity_unit: optionalString,
    nutriments: openFoodFactsNutrimentsSchema.optional(),
  })
  .passthrough();

export const openFoodFactsBarcodeResponseSchema = z
  .object({
    code: optionalString,
    status: z.union([z.number(), z.string()]).optional(),
    status_verbose: optionalString,
    product: openFoodFactsRawProductSchema.optional(),
    result: z
      .object({
        id: optionalString,
        name: optionalString,
        status: z.union([z.number(), z.string()]).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const openFoodFactsSearchResponseSchema = z
  .object({
    count: z.number().int().nonnegative().optional(),
    page: z.number().int().positive().optional(),
    page_size: z.number().int().positive().optional(),
    page_count: z.number().int().nonnegative().optional(),
    hits: z.array(z.unknown()),
    timed_out: z.boolean().optional(),
  })
  .passthrough();

export const openFoodFactsSearchErrorResponseSchema = z
  .object({
    errors: z.array(z.object({
      title: optionalString,
      description: optionalString,
      status: z.number().int().optional(),
    }).passthrough()).min(1),
  })
  .passthrough();

export const openFoodFactsLegacySearchResponseSchema = z
  .object({
    count: z.number().int().nonnegative().optional(),
    page: z.number().int().positive().optional(),
    page_size: z.number().int().positive().optional(),
    products: z.array(openFoodFactsRawProductSchema).default([]),
  })
  .passthrough();

export type OpenFoodFactsRawProduct = z.infer<typeof openFoodFactsRawProductSchema>;
