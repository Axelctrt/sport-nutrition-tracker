import { expect, test, type Page } from '@playwright/test';

import { createLocalProfile, getBrowserLocalDate } from './helpers/app';

const DATABASE_NAME = 'sportpilot-local-database';
const CRITICAL_STORES = [
  'userProfile',
  'appSettings',
  'weights',
  'dailySteps',
  'activities',
  'foodProducts',
  'meals',
  'foodEntries',
  'favoriteMeals',
  'recipes',
  'recipeIngredients',
  'dailyTargets',
  'dailyJournalStatuses',
  'weeklyReviews',
  'acceptedCalorieAdjustments',
  'exerciseDefinitions',
  'workoutTemplates',
  'workoutTemplateExercises',
  'workoutSessions',
  'workoutSessionExercises',
  'strengthSets',
  'progressionSuggestions',
] as const;

interface DatabaseSnapshot {
  counts: Record<string, number>;
  criticalRecords: Record<string, unknown[]>;
}

async function waitForDatabaseCreation(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(async (databaseName) => {
          const databases = await indexedDB.databases();
          return databases.some(({ name }) => name === databaseName);
        }, DATABASE_NAME),
      {
        timeout: 30_000,
        message: 'La base IndexedDB de SportPilot doit être créée.',
      },
    )
    .toBe(true);
}

async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration =
            await navigator.serviceWorker.getRegistration();

          if (!registration) return 'missing';
          if (registration.active) return registration.active.state;
          if (registration.waiting) return registration.waiting.state;
          if (registration.installing) return registration.installing.state;

          return 'registered';
        }),
      {
        timeout: 30_000,
        message:
          'Le service worker initial doit être enregistré et activé.',
      },
    )
    .toBe('activated');

  const hasController = await page.evaluate(
    () => Boolean(navigator.serviceWorker.controller),
  );

  if (!hasController) {
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  await expect
    .poll(
      () =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      {
        timeout: 30_000,
        message: 'La page doit être contrôlée par le service worker.',
      },
    )
    .toBe(true);
}

async function readBuildMarker(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const response = await fetch('/pwa-update-test-marker.svg');

    if (!response.ok) {
      throw new Error(
        `Impossible de lire le marqueur PWA : ${response.status}`,
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('image/svg+xml')) {
      throw new Error(
        `Type inattendu pour le marqueur PWA : ${contentType}`,
      );
    }

    return response.text();
  });
}

async function seedRepresentativeData(page: Page): Promise<void> {
  const date = await getBrowserLocalDate(page);
  const now = new Date().toISOString();

  await page.evaluate(
    async ({ databaseName, currentDate, currentDateTime }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(
            request.error ?? new Error('Ouverture IndexedDB impossible.'),
          );
      });

      const recordsByStore: Record<string, Record<string, unknown>[]> = {
        weights: [
          {
            id: 'pwa-weight-1',
            date: currentDate,
            weightKg: 69.4,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        dailySteps: [
          {
            id: 'pwa-steps-1',
            date: currentDate,
            totalSteps: 12_500,
            source: 'manual',
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        activities: [
          {
            id: 'pwa-activity-1',
            type: 'running',
            name: 'Footing migration',
            date: currentDate,
            durationMinutes: 50,
            distanceKm: 8,
            averageCadenceSpm: 172,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        foodProducts: [
          {
            id: 'pwa-product-1',
            name: 'Yaourt migration',
            basisUnit: 'g',
            nutritionPer100: {
              caloriesKcal: 120,
              proteinGrams: 10,
              carbohydratesGrams: 8,
              fatGrams: 4,
            },
            source: { type: 'manual' },
            isNutritionComplete: true,
            isFavorite: true,
            isArchived: false,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        meals: [
          {
            id: 'pwa-meal-1',
            date: currentDate,
            slot: 'lunch',
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        foodEntries: [
          {
            id: 'pwa-food-entry-1',
            date: currentDate,
            mealId: 'pwa-meal-1',
            mealSlot: 'lunch',
            sourceType: 'product',
            productId: 'pwa-product-1',
            quantity: 150,
            unit: 'g',
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        favoriteMeals: [
          {
            id: 'pwa-favorite-meal-1',
            name: 'Déjeuner migration',
            items: [
              {
                productId: 'pwa-product-1',
                quantity: 150,
                unit: 'g',
              },
            ],
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        recipes: [
          {
            id: 'pwa-recipe-1',
            name: 'Recette migration',
            numberOfServings: 1,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        recipeIngredients: [
          {
            id: 'pwa-recipe-ingredient-1',
            recipeId: 'pwa-recipe-1',
            productId: 'pwa-product-1',
            quantity: 150,
            unit: 'g',
            sortOrder: 0,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        dailyTargets: [
          {
            id: 'pwa-daily-target-1',
            date: currentDate,
            caloriesKcal: 2_400,
            proteinGrams: 120,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        dailyJournalStatuses: [
          {
            id: 'pwa-journal-status-1',
            date: currentDate,
            isComplete: true,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        weeklyReviews: [
          {
            id: 'pwa-weekly-review-1',
            weekStart: currentDate,
            averageWeightKg: 69.4,
            averageCaloriesKcal: 2_350,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        acceptedCalorieAdjustments: [
          {
            id: 'pwa-calorie-adjustment-1',
            effectiveFrom: currentDate,
            status: 'accepted',
            deltaKcal: 100,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        exerciseDefinitions: [
          {
            id: 'pwa-exercise-definition-1',
            name: 'Développé couché migration',
            source: 'custom',
            primaryMuscleGroup: 'chest',
            equipment: 'barbell',
            isArchived: false,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        workoutTemplates: [
          {
            id: 'pwa-workout-template-1',
            name: 'Modèle migration',
            isArchived: false,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        workoutTemplateExercises: [
          {
            id: 'pwa-workout-template-exercise-1',
            templateId: 'pwa-workout-template-1',
            exerciseDefinitionId: 'pwa-exercise-definition-1',
            sortOrder: 0,
            isActive: true,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        workoutSessions: [
          {
            id: 'pwa-workout-session-1',
            date: currentDate,
            status: 'completed',
            sourceTemplateId: 'pwa-workout-template-1',
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        workoutSessionExercises: [
          {
            id: 'pwa-workout-session-exercise-1',
            sessionId: 'pwa-workout-session-1',
            exerciseDefinitionId: 'pwa-exercise-definition-1',
            sortOrder: 0,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        strengthSets: [
          {
            id: 'pwa-strength-set-1',
            sessionId: 'pwa-workout-session-1',
            sessionExerciseId: 'pwa-workout-session-exercise-1',
            setNumber: 1,
            type: 'working',
            repetitions: 8,
            weightKg: 60,
            rpe: 7,
            isCompleted: true,
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
        progressionSuggestions: [
          {
            id: 'pwa-progression-suggestion-1',
            sessionId: 'pwa-workout-session-1',
            sessionExerciseId: 'pwa-workout-session-exercise-1',
            exerciseDefinitionId: 'pwa-exercise-definition-1',
            templateExerciseId: 'pwa-workout-template-exercise-1',
            status: 'pending',
            createdAt: currentDateTime,
            updatedAt: currentDateTime,
          },
        ],
      };

      const storeNames = Object.keys(recordsByStore).filter((storeName) =>
        database.objectStoreNames.contains(storeName),
      );
      const transaction = database.transaction(storeNames, 'readwrite');
      let failedOperation = 'initialisation de la transaction';
      const registerFailureContext = (
        request: IDBRequest,
        operation: string,
      ): void => {
        request.onerror = () => {
          failedOperation = operation;
        };
      };
      const completion = new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
          const cause = transaction.error;
          reject(
            new Error(
              `Écriture IndexedDB impossible pendant ${failedOperation}: ${cause?.name ?? 'erreur inconnue'}${cause?.message ? ` — ${cause.message}` : ''}`,
            ),
          );
        };
        transaction.onabort = () => {
          const cause = transaction.error;
          reject(
            new Error(
              `Écriture IndexedDB annulée pendant ${failedOperation}: ${cause?.name ?? 'erreur inconnue'}${cause?.message ? ` — ${cause.message}` : ''}`,
            ),
          );
        };
      });

      // Le tableau de bord peut créer automatiquement des données dérivées
      // (par exemple l'objectif journalier du jour). Cette base appartient
      // exclusivement au scénario E2E : on remet donc les tables ciblées à
      // zéro avant d'insérer un jeu déterministe, sans toucher au profil ni
      // aux paramètres créés par l'onboarding.
      for (const storeName of storeNames) {
        const request = transaction.objectStore(storeName).clear();
        registerFailureContext(request, `la remise à zéro de ${storeName}`);
      }

      for (const storeName of storeNames) {
        const store = transaction.objectStore(storeName);
        for (const record of recordsByStore[storeName] ?? []) {
          const request = store.put(record);
          registerFailureContext(
            request,
            `l'insertion dans ${storeName} de ${String(record.id ?? 'identifiant inconnu')}`,
          );
        }
      }

      try {
        await completion;
      } finally {
        database.close();
      }
    },
    {
      databaseName: DATABASE_NAME,
      currentDate: date,
      currentDateTime: now,
    },
  );
}

async function snapshotDatabase(page: Page): Promise<DatabaseSnapshot> {
  return page.evaluate(
    async ({ databaseName, criticalStores }) => {
      const selectedCriticalStores = new Set<string>(criticalStores);
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(
            request.error ?? new Error('Ouverture IndexedDB impossible.'),
          );
      });

      try {
        const storeNames = [...database.objectStoreNames];
        const transaction = database.transaction(storeNames, 'readonly');
        const completion = new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () =>
            reject(
              transaction.error ?? new Error('Lecture IndexedDB impossible.'),
            );
          transaction.onabort = () =>
            reject(
              transaction.error ?? new Error('Lecture IndexedDB annulée.'),
            );
        });
        const counts: Record<string, number> = {};
        const criticalRecords: Record<string, unknown[]> = {};

        await Promise.all(
          storeNames.map(
            (storeName) =>
              new Promise<void>((resolve, reject) => {
                const request = transaction
                  .objectStore(storeName)
                  .getAll();
                request.onsuccess = () => {
                  const records = request.result as Record<string, unknown>[];
                  const retainedRecords =
                    storeName === 'exerciseDefinitions'
                      ? records.filter((record) => {
                          const id = record.id;
                          const source = record.source;

                          return !(
                            source === 'catalog' ||
                            (typeof id === 'string' &&
                              id.startsWith('catalog:'))
                          );
                        })
                      : records;

                  // Les exercices du catalogue sont des données système
                  // régénérables. La conservation doit porter strictement sur
                  // les exercices personnalisés et sur les données utilisateur.
                  counts[storeName] = retainedRecords.length;
                  if (selectedCriticalStores.has(storeName)) {
                    criticalRecords[storeName] = retainedRecords;
                  }
                  resolve();
                };
                request.onerror = () =>
                  reject(
                    request.error ??
                      new Error(`Lecture de ${storeName} impossible.`),
                  );
              }),
          ),
        );

        await completion;
        return {
          counts: Object.fromEntries(
            Object.entries(counts).sort(([left], [right]) =>
              left.localeCompare(right),
            ),
          ),
          criticalRecords: Object.fromEntries(
            Object.entries(criticalRecords).sort(([left], [right]) =>
              left.localeCompare(right),
            ),
          ),
        };
      } finally {
        database.close();
      }
    },
    {
      databaseName: DATABASE_NAME,
      criticalStores: [...CRITICAL_STORES],
    },
  );
}

test('conserve les données pendant le remplacement de la PWA sous la même origine', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await waitForServiceWorkerControl(page);
  await expect
    .poll(() => readBuildMarker(page))
    .toContain('sportpilot-pwa-build-old');

  await createLocalProfile(page, 'Migration');
  await waitForDatabaseCreation(page);

  // Quitter le tableau de bord avant l'injection empêche ses calculs
  // automatiques de concurrencer la transaction de préparation du test.
  await page.goto('/#/privacy');
  await expect(page.locator('#root')).not.toBeEmpty();
  await seedRepresentativeData(page);

  const beforeUpdate = await snapshotDatabase(page);

  for (const storeName of CRITICAL_STORES) {
    expect(
      beforeUpdate.counts[storeName],
      `${storeName} doit être couvert`,
    ).toBeGreaterThan(0);
  }

  const switchResponse = await request.post('/__pwa-test/switch-to-new');
  expect(switchResponse.ok()).toBe(true);
  await expect
    .poll(() => readBuildMarker(page))
    .toContain('sportpilot-pwa-build-old');

  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });

  const updatePrompt = page.getByRole('status', {
    name: 'Mise à jour disponible',
  });
  await expect(updatePrompt).toBeVisible({ timeout: 30_000 });

  const pageReloaded = page.waitForEvent('framenavigated', {
    predicate: (frame) => frame === page.mainFrame(),
    timeout: 30_000,
  });

  await updatePrompt
    .getByRole('button', { name: 'Mettre à jour maintenant' })
    .click();
  await pageReloaded;
  await page.waitForLoadState('domcontentloaded');

  await expect
    .poll(() => readBuildMarker(page), { timeout: 30_000 })
    .toContain('sportpilot-pwa-build-new');
  await expect
    .poll(() => snapshotDatabase(page), { timeout: 30_000 })
    .toEqual(beforeUpdate);

  await expect(page).toHaveURL(/#\/privacy$/);
  await expect(page.locator('#root')).not.toBeEmpty();
});
