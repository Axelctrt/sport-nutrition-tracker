import { mapOpenFoodFactsProduct } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';

describe('mapOpenFoodFactsProduct', () => {
  it('mappe un produit complet pour 100 g', () => {
    const result = mapOpenFoodFactsProduct(
      {
        code: '3017624010701',
        product_name_fr: 'Pâte à tartiner',
        brands: 'Exemple',
        serving_quantity: 15,
        serving_quantity_unit: 'g',
        nutriments: {
          'energy-kcal_100g': 539,
          proteins_100g: 6.3,
          carbohydrates_100g: 57.5,
          fat_100g: 30.9,
          fiber_100g: 3.4,
          salt_100g: 0.11,
        },
      },
      undefined,
      '2026-06-23T12:00:00.000Z',
    );

    expect(result).toMatchObject({
      barcode: '3017624010701',
      name: 'Pâte à tartiner',
      brand: 'Exemple',
      basisUnit: 'g',
      servingSize: 15,
      isNutritionComplete: true,
      missingNutritionFields: [],
      nutritionPer100: {
        caloriesKcal: 539,
        proteinGrams: 6.3,
        carbohydratesGrams: 57.5,
        fatGrams: 30.9,
        fiberGrams: 3.4,
        saltGrams: 0.11,
      },
    });
  });

  it('convertit les kilojoules en kilocalories', () => {
    const result = mapOpenFoodFactsProduct({
      code: '12345678',
      product_name: 'Produit test',
      nutriments: {
        energy_100g: 418.4,
        proteins_100g: 1,
        carbohydrates_100g: 2,
        fat_100g: 3,
      },
    });

    expect(result?.nutritionPer100.caloriesKcal).toBeCloseTo(100);
    expect(result?.isNutritionComplete).toBe(true);
  });

  it('signale les nutriments obligatoires manquants sans produire de NaN', () => {
    const result = mapOpenFoodFactsProduct({
      code: '12345678',
      product_name: 'Produit incomplet',
      nutriments: {
        'energy-kcal_100g': 80,
        proteins_100g: 4,
      },
    });

    expect(result?.isNutritionComplete).toBe(false);
    expect(result?.missingNutritionFields).toEqual(['carbohydratesGrams', 'fatGrams']);
    expect(result?.nutritionPer100.carbohydratesGrams).toBe(0);
    expect(result?.nutritionPer100.fatGrams).toBe(0);
  });

  it('détecte une base en millilitres', () => {
    const result = mapOpenFoodFactsProduct({
      code: '12345678',
      product_name: 'Boisson',
      nutrition_data_per: '100ml',
      serving_size: '250 ml',
      nutriments: {
        'energy-kcal_100ml': 42,
        proteins_100ml: 0,
        carbohydrates_100ml: 10.5,
        fat_100ml: 0,
      },
    });

    expect(result).toMatchObject({
      basisUnit: 'ml',
      servingSize: 250,
      servingLabel: '250 ml',
      isNutritionComplete: true,
    });
  });

  it('utilise le code de repli lorsque le produit ne le contient pas', () => {
    expect(
      mapOpenFoodFactsProduct(
        {
          product_name: 'Produit',
          nutriments: {},
        },
        '12345678',
      )?.barcode,
    ).toBe('12345678');
  });
});
