import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  buildGlobalSearchIndex,
  normalizeSearchText,
  searchGlobalIndex,
} from '@/application/search/globalSearchService';

function table<T>(values: T[]) {
  return {
    toArray: vi.fn().mockResolvedValue(values),
  };
}

function createDatabase(): AppDatabase {
  return {
    activities: table([
      {
        id: 'activity-1',
        date: '2026-06-28',
        type: 'running',
        intensity: 'moderate',
        durationMinutes: 45,
        sessionType: 'tempo',
        distanceKm: 8,
        averageCadenceSpm: 170,
        calculation: {
          weightKg: 60,
          estimatedCaloriesKcal: 500,
          calculationVersion: 1,
        },
        createdAt: '2026-06-28T10:00:00.000Z',
        updatedAt: '2026-06-28T10:00:00.000Z',
      },
    ]),
    foodProducts: table([
      {
        id: 'product-1',
        name: 'Banane',
        brand: 'Marché',
        basisUnit: 'g',
        nutritionPer100: {
          caloriesKcal: 89,
          proteinGrams: 1.1,
          carbohydratesGrams: 23,
          fatGrams: 0.3,
        },
        source: { type: 'manual' },
        isNutritionComplete: true,
        isFavorite: true,
        isArchived: false,
        createdAt: '2026-06-28T10:00:00.000Z',
        updatedAt: '2026-06-28T10:00:00.000Z',
      },
    ]),
    recipes: table([
      {
        id: 'recipe-1',
        name: 'Porridge banane',
        numberOfServings: 1,
        notes: 'Petit-déjeuner',
        createdAt: '2026-06-28T10:00:00.000Z',
        updatedAt: '2026-06-28T10:00:00.000Z',
      },
    ]),
    favoriteMeals: table([]),
    workoutSessions: table([
      {
        id: 'session-1',
        date: '2026-06-27',
        status: 'completed',
        sourceTemplateNameSnapshot: 'Push',
        durationMinutes: 60,
        createdAt: '2026-06-27T10:00:00.000Z',
        updatedAt: '2026-06-27T11:00:00.000Z',
      },
    ]),
    workoutTemplates: table([]),
    exerciseDefinitions: table([
      {
        id: 'exercise-1',
        name: 'Développé couché',
        primaryMuscleGroup: 'pectorals',
        secondaryMuscleGroups: ['triceps'],
        equipment: 'barbell',
        category: 'strength',
        movementType: 'compound',
        loadUnit: 'kg',
        source: 'catalog',
        isArchived: false,
        createdAt: '2026-06-28T10:00:00.000Z',
        updatedAt: '2026-06-28T10:00:00.000Z',
      },
    ]),
    weights: table([
      {
        id: 'weight-1',
        date: '2026-06-28',
        weightKg: 60.2,
        note: 'À jeun',
        createdAt: '2026-06-28T07:00:00.000Z',
        updatedAt: '2026-06-28T07:00:00.000Z',
      },
    ]),
  } as unknown as AppDatabase;
}

describe('globalSearchService', () => {
  it('normalise les accents et la ponctuation', () => {
    expect(normalizeSearchText('Développé-couché !')).toBe(
      'developpe couche',
    );
  });

  it('construit un index multi-domaines avec navigation directe', async () => {
    const index = await buildGlobalSearchIndex(createDatabase());

    expect(index).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'foodProduct',
          title: 'Banane',
          path: '/food/products/product-1/edit',
        }),
        expect.objectContaining({
          category: 'workoutSession',
          title: 'Push',
          path: '/strength/sessions/session-1',
        }),
        expect.objectContaining({
          category: 'weight',
          path: '/weight?date=2026-06-28',
        }),
      ]),
    );
  });

  it('retrouve plusieurs mots sans tenir compte des accents', async () => {
    const index = await buildGlobalSearchIndex(createDatabase());

    expect(
      searchGlobalIndex(index, 'developpe pectoraux'),
    ).toEqual([
      expect.objectContaining({
        id: 'exercise-1',
      }),
    ]);
  });

  it('filtre les résultats par catégorie', async () => {
    const index = await buildGlobalSearchIndex(createDatabase());

    const results = searchGlobalIndex(
      index,
      'banane',
      'recipe',
    );

    expect(results).toEqual([
      expect.objectContaining({
        id: 'recipe-1',
        category: 'recipe',
      }),
    ]);
  });
});
