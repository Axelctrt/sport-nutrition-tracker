import { z } from 'zod';
import { isSupportedBarcode } from '@/infrastructure/open-food-facts/barcode';

const optionalNutritionNumber = z
  .number({ message: 'Saisis un nombre valide.' })
  .min(0, 'La valeur ne peut pas être négative.')
  .max(100_000, 'La valeur saisie est trop élevée.')
  .optional();

export const foodProductFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Saisis le nom de l’aliment.')
    .max(120, 'Le nom ne peut pas dépasser 120 caractères.'),
  brand: z
    .string()
    .trim()
    .max(120, 'La marque ne peut pas dépasser 120 caractères.'),
  basisUnit: z.enum(['g', 'ml']),
  caloriesKcal: z
    .number({ message: 'Saisis les calories pour 100 unités.' })
    .min(0, 'Les calories ne peuvent pas être négatives.')
    .max(10_000, 'Les calories pour 100 unités sont trop élevées.'),
  proteinGrams: z
    .number({ message: 'Saisis les protéines pour 100 unités.' })
    .min(0, 'Les protéines ne peuvent pas être négatives.')
    .max(100, 'Les protéines ne peuvent pas dépasser 100 g pour 100 unités.'),
  carbohydratesGrams: z
    .number({ message: 'Saisis les glucides pour 100 unités.' })
    .min(0, 'Les glucides ne peuvent pas être négatifs.')
    .max(100, 'Les glucides ne peuvent pas dépasser 100 g pour 100 unités.'),
  fatGrams: z
    .number({ message: 'Saisis les lipides pour 100 unités.' })
    .min(0, 'Les lipides ne peuvent pas être négatifs.')
    .max(100, 'Les lipides ne peuvent pas dépasser 100 g pour 100 unités.'),
  fiberGrams: optionalNutritionNumber,
  saltGrams: optionalNutritionNumber,
  servingLabel: z
    .string()
    .trim()
    .max(120, 'Le libellé de portion ne peut pas dépasser 120 caractères.'),
  servingSize: z
    .number({ message: 'Saisis une taille de portion valide.' })
    .min(0.1, 'La taille de portion doit être supérieure à zéro.')
    .max(10_000, 'La taille de portion est trop élevée.')
    .optional(),
  barcode: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || isSupportedBarcode(value),
      'Le code-barres doit contenir de 4 à 14 chiffres.',
    ),
  isFavorite: z.boolean(),
});

export type FoodProductFormValues = z.infer<typeof foodProductFormSchema>;
