import { expect, test, type Page } from '@playwright/test';

import { createLocalProfile, getBrowserLocalDate } from './helpers/app';

const DATABASE_NAME = 'sportpilot-local-database';
const CRITICAL_STORES = [
  'userProfile',
  'userSettings',
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

test.afterAll(async ({ request }) => {
  await request.post('/__pwa-test/shutdown');
});

interface DatabaseSnapshot {
  counts: Record<string, number>;
  criticalRecords: Record<string, unknown[]>;
}

type CacheStorageSnapshot = Record<string, string[]>;

async function snapshotCacheStorage(page: Page): Promise<CacheStorageSnapshot> {
  return page.evaluate(async () => {
    const snapshot: CacheStorageSnapshot = {};

    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      snapshot[cacheName] = requests
        .map((request) => new URL(request.url).pathname)
        .sort((left, right) => left.localeCompare(right));
    }

    return Object.fromEntries(
      Object.entries(snapshot).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
  });
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
            intensity: 'moderate',
            sessionType: 'easy',
            distanceKm: 8,
            averageCadenceSpm: 172,
            calculation: {
              weightKg: 69.4,
              estimatedCaloriesKcal: 480,
              calculationVersion: 1,
            },
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
            reference: {
              sourceType: 'product',
              productId: 'pwa-product-1',
              inputMode: 'amount',
              inputQuantity: 150,
              normalizedAmount: 150,
              normalizedUnit: 'g',
              nutritionPer100Snapshot: {
                caloriesKcal: 120,
                proteinGrams: 10,
                carbohydratesGrams: 8,
                fatGrams: 4,
              },
            },
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
            calculationWeightKg: 69.4,
            energy: {
              bmrKcal: 1_600,
              occupationalBaseKcal: 1_900,
              walkingKcal: 0,
              runningKcal: 480,
              swimmingKcal: 0,
              strengthTrainingKcal: 0,
              otherActivitiesKcal: 0,
              totalEstimatedExpenditureKcal: 2_380,
            },
            goalAdjustmentKcal: 0,
            acceptedCalibrationAdjustmentKcal: 0,
            calorieFloorKcal: 1_600,
            targetCaloriesKcal: 2_400,
            macros: {
              proteinGrams: 120,
              carbohydratesGrams: 300,
              fatGrams: 80,
            },
            calculationVersion: 1,
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

test('démarre sur l’accueil hors ligne après une première installation online', async ({
  context,
  page,
  request,
}, testInfo) => {
  const resetResponse = await request.post('/__pwa-test/reset-to-old');
  expect(resetResponse.ok()).toBe(true);

  await createLocalProfile(page, 'Cold launch');
  await waitForDatabaseCreation(page);
  await waitForServiceWorkerControl(page);

  // Ne pas visiter Analytics : les dépendances nécessaires au démarrage de
  // l'accueil doivent être disponibles dès l'installation initiale de la PWA.
  await page.goto('/#/privacy');
  await expect(page.locator('#root')).not.toBeEmpty();
  await seedRepresentativeData(page);

  const beforeColdLaunch = await snapshotDatabase(page);
  const onlineCaches = await snapshotCacheStorage(page);

  for (const storeName of CRITICAL_STORES) {
    expect(
      beforeColdLaunch.counts[storeName],
      `${storeName} doit être couvert avant le cold launch`,
    ).toBeGreaterThan(0);
  }

  await page.close();
  await context.setOffline(true);

  const offlinePage = await context.newPage();
  const failedScripts: string[] = [];
  const pageErrors: string[] = [];
  offlinePage.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (
      request.resourceType() === 'script'
      && url.origin === new URL(testInfo.project.use.baseURL as string).origin
    ) {
      failedScripts.push(`${url.pathname} — ${request.failure()?.errorText ?? 'échec inconnu'}`);
    }
  });
  offlinePage.on('pageerror', (error) => pageErrors.push(error.message));

  let navigationError: string | undefined;
  try {
    await offlinePage.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  await offlinePage.getByRole('button', {
    name: 'Découvrir mon accueil',
  }).click({ timeout: 5_000 }).catch(() => undefined);

  const dashboardHeading = offlinePage.getByRole('heading', {
    name: 'Bonjour Cold launch',
  });
  const routeErrorHeading = offlinePage.getByRole('heading', {
    name: /SportPilot n.a pas pu ouvrir cette page/,
  });
  await Promise.race([
    dashboardHeading.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined),
    routeErrorHeading.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined),
  ]);

  const offlineCaches = await snapshotCacheStorage(offlinePage);
  const coldLaunchState = {
    navigationError,
    dashboardVisible: await dashboardHeading.isVisible(),
    routeErrorVisible: await routeErrorHeading.isVisible(),
    body: (await offlinePage.locator('body').innerText()).slice(0, 2_000),
    failedScripts,
    pageErrors,
    onlineCaches,
    offlineCaches,
  };
  await testInfo.attach('cold-launch-state.json', {
    body: Buffer.from(JSON.stringify(coldLaunchState, null, 2)),
    contentType: 'application/json',
  });

  expect(navigationError, JSON.stringify(coldLaunchState, null, 2)).toBeUndefined();
  expect(coldLaunchState.dashboardVisible, JSON.stringify(coldLaunchState, null, 2)).toBe(true);
  expect(failedScripts, JSON.stringify(coldLaunchState, null, 2)).toEqual([]);
  expect(pageErrors, JSON.stringify(coldLaunchState, null, 2)).toEqual([]);

  const precacheScripts = Object.entries(onlineCaches)
    .filter(([cacheName]) => cacheName.startsWith('workbox-precache'))
    .flatMap(([, urls]) => urls);
  expect(precacheScripts).toEqual(expect.arrayContaining([
    expect.stringMatching(/\/assets\/analytics-[^/]+\.js$/),
    expect.stringMatching(/\/assets\/analyticsService-[^/]+\.js$/),
  ]));
  expect(precacheScripts).not.toEqual(expect.arrayContaining([
    expect.stringMatching(/\/assets\/AnalyticsPage-[^/]+\.js$/),
  ]));

  const afterColdLaunch = await snapshotDatabase(offlinePage);
  for (const storeName of CRITICAL_STORES) {
    if (storeName === 'dailyTargets') {
      const retainedTargetIds = new Set(
        (afterColdLaunch.criticalRecords[storeName] ?? []).map((record) => record.id),
      );
      expect(
        (beforeColdLaunch.criticalRecords[storeName] ?? []).every(
          (record) => retainedTargetIds.has(record.id),
        ),
        'les cibles dérivées peuvent être recalculées, mais pas perdues',
      ).toBe(true);
      continue;
    }

    expect(afterColdLaunch.criticalRecords[storeName]).toEqual(
      expect.arrayContaining(beforeColdLaunch.criticalRecords[storeName] ?? []),
    );
  }

  await offlinePage.goto('/#/?action=weight', { waitUntil: 'domcontentloaded' });
  await offlinePage.getByRole('button', {
    name: 'Découvrir mon accueil',
  }).click({ timeout: 5_000 }).catch(() => undefined);
  const weightDialog = offlinePage.getByRole('dialog', { name: 'Ajouter une pesée' });
  await expect(weightDialog).toBeVisible();
  await weightDialog.getByLabel('Poids en kilogrammes').fill('70.1');
  await weightDialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(weightDialog).toBeHidden();

  await offlinePage.reload({ waitUntil: 'domcontentloaded' });
  await offlinePage.getByRole('button', {
    name: 'Découvrir mon accueil',
  }).click({ timeout: 5_000 }).catch(() => undefined);
  await expect(dashboardHeading).toBeVisible();

  const afterOfflineWrite = await snapshotDatabase(offlinePage);
  expect(afterOfflineWrite.counts.weights).toBe(afterColdLaunch.counts.weights);
  expect(afterOfflineWrite.criticalRecords.weights).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: 'pwa-weight-1',
      weightKg: 70.1,
    }),
  ]));
});

test('conserve les données pendant le remplacement de la PWA sous la même origine', async ({
  page,
  request,
}) => {
  const resetResponse = await request.post('/__pwa-test/reset-to-old');
  expect(resetResponse.ok()).toBe(true);
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
