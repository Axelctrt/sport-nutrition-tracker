import { expect, type Page } from '@playwright/test';

import { achievementCatalog } from '../../src/domain/rewards/achievements';

const DATABASE_NAME = 'sportpilot-local-database';
const VISUAL_THEME_STORAGE_KEY = 'sport-pilot.reward-themes';
const VISUAL_THEME_BOOT_STORAGE_KEY = 'sport-pilot.active-theme';
const APPEARANCE_STORAGE_KEY = 'sport-pilot.theme';

export type VisualQaTheme =
  | 'core'
  | 'neon-pulse'
  | 'emerald-focus'
  | 'aurora'
  | 'zenith-gold';

export async function waitForSportPilotDatabase(page: Page): Promise<void> {
  await expect.poll(
    () => page.evaluate(async (databaseName) => {
      const databases = await indexedDB.databases();
      return databases.some(({ name }) => name === databaseName);
    }, DATABASE_NAME),
    {
      timeout: 30_000,
      message: 'La base locale SportPilot doit être disponible.',
    },
  ).toBe(true);
}

export async function seedPerformanceGlassData(page: Page): Promise<void> {
  await waitForSportPilotDatabase(page);
  const achievementIds = achievementCatalog.map(({ id }) => id);

  await page.evaluate(async ({ databaseName, achievementIds: seededAchievementIds }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = new Date().toISOString();
    const dateAgo = (daysAgo: number) => {
      const value = new Date();
      value.setHours(12, 0, 0, 0);
      value.setDate(value.getDate() - daysAgo);
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const metadata = (id: string) => ({
      id,
      createdAt: now,
      updatedAt: now,
    });
    const nutritionSnapshot = {
      caloriesKcal: 480,
      proteinGrams: 34,
      carbohydratesGrams: 52,
      fatGrams: 15,
      fiberGrams: 8,
    };
    const dates = Array.from({ length: 15 }, (_, index) => dateAgo(index * 2));
    const weightOffsets = [84, 77, 70, 63, 56, 49, 42, 35, 28, 21, 14, 7, 0];

    const weights = weightOffsets.map((offset, index) => ({
      ...metadata(`visual-weight-${index}`),
      date: dateAgo(offset),
      weightKg: Math.round((75.2 - index * 0.18) * 100) / 100,
    }));
    const dailySteps = dates.map((date, index) => ({
      ...metadata(`visual-steps-${index}`),
      date,
      totalSteps: 8_200 + index * 310,
      source: 'manual',
    }));
    const activities = Array.from({ length: 20 }, (_, index) => {
      const date = dateAgo(index * 3);
      const base = {
        ...metadata(`visual-activity-${index}`),
        date,
        durationMinutes: 34 + index % 5 * 7,
        intensity: index % 4 === 0 ? 'high' : 'moderate',
        calculation: {
          weightKg: 73.5,
          estimatedCaloriesKcal: 280 + index * 6,
          calculationVersion: 1,
        },
      };

      if (index % 3 === 0) {
        return {
          ...base,
          type: 'cycling',
          met: 7.5,
          includedInDailySteps: false,
          distanceKm: 24 + index,
          elevationGainMeters: 180 + index * 18,
          bikeType: 'road',
          environment: 'outdoor',
        };
      }
      if (index % 3 === 1) {
        return {
          ...base,
          type: 'running',
          sessionType: 'easy',
          distanceKm: 6 + index * 0.2,
          averageCadenceSpm: 168 + index % 6,
          elevationGainMeters: 40 + index * 3,
          terrainType: 'road',
        };
      }
      return {
        ...base,
        type: 'walking',
        met: 4,
        includedInDailySteps: true,
      };
    });
    const foodProducts = [{
      ...metadata('visual-product'),
      name: 'Assiette équilibrée',
      basisUnit: 'g',
      nutritionPer100: nutritionSnapshot,
      source: { type: 'manual' },
      isNutritionComplete: true,
      isFavorite: true,
      isArchived: false,
    }];
    const meals = dates.map((date, index) => ({
      ...metadata(`visual-meal-${index}`),
      date,
      slot: 'lunch',
      title: 'Déjeuner suivi',
    }));
    const foodEntries = dates.flatMap((date, index) => {
      const amount = 92 + index * 2;
      return [{
        ...metadata(`visual-food-${index}`),
        date,
        mealId: `visual-meal-${index}`,
        mealSlot: 'lunch',
        sourceType: 'product',
        reference: {
          sourceType: 'product',
          productId: 'visual-product',
          inputMode: 'amount',
          inputQuantity: amount,
          normalizedAmount: amount,
          normalizedUnit: 'g',
          nutritionPer100Snapshot: nutritionSnapshot,
        },
      }, {
        ...metadata(`visual-snack-${index}`),
        date,
        mealId: `visual-meal-${index}`,
        mealSlot: 'snacks',
        sourceType: 'product',
        reference: {
          sourceType: 'product',
          productId: 'visual-product',
          inputMode: 'amount',
          inputQuantity: 35 + index,
          normalizedAmount: 35 + index,
          normalizedUnit: 'g',
          nutritionPer100Snapshot: {
            caloriesKcal: 310,
            proteinGrams: 19,
            carbohydratesGrams: 28,
            fatGrams: 12,
          },
        },
      }];
    });
    const dailyTargets = dates.map((date, index) => {
      const targetCaloriesKcal = 2_250 + index % 4 * 50;
      return {
        ...metadata(`visual-target-${index}`),
        date,
        calculationWeightKg: 73.5,
        energy: {
          bmrKcal: 1_650,
          occupationalBaseKcal: 430,
          walkingKcal: 120,
          runningKcal: 0,
          swimmingKcal: 0,
          strengthTrainingKcal: 0,
          otherActivitiesKcal: 80,
          totalEstimatedExpenditureKcal: targetCaloriesKcal,
        },
        goalAdjustmentKcal: 0,
        acceptedCalibrationAdjustmentKcal: 0,
        calorieFloorKcal: 1_850,
        targetCaloriesKcal,
        macros: {
          proteinGrams: 145,
          carbohydratesGrams: 265 + index % 3 * 10,
          fatGrams: 72,
        },
        calculationVersion: 1,
      };
    });
    const dailyJournalStatuses = dates.map((date, index) => ({
      ...metadata(`visual-journal-${index}`),
      date,
      isComplete: true,
      completedAt: now,
    }));
    const dailyCheckIns = dates.map((date, index) => ({
      ...metadata(`visual-check-in-${index}`),
      date,
      sleepDurationMinutes: 410 + index % 4 * 20,
      sleepQuality: index % 5 === 0 ? 'average' : 'good',
      readiness: index % 4 === 0 ? 'normal' : 'high',
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: now,
    }));
    const dailyCheckOuts = dates.map((date, index) => ({
      ...metadata(`visual-check-out-${index}`),
      date,
      hunger: index % 3 === 0 ? 'high' : 'normal',
      energy: index % 5 === 0 ? 'normal' : 'high',
      foodJournalComplete: true,
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: now,
    }));
    const dailyActivityDecisions = [1, 8, 15, 22].map((offset, index) => ({
      ...metadata(`visual-rest-${index}`),
      date: dateAgo(offset),
      decision: 'rest',
      confirmedAt: now,
    }));
    const exerciseDefinitions = [
      {
        ...metadata('visual-bench'),
        name: 'Développé couché',
        primaryMuscleGroup: 'chest',
        secondaryMuscleGroups: ['triceps'],
        equipment: 'barbell',
        category: 'compound',
        movementType: 'push',
        loadUnit: 'kg',
        trackingMode: 'loadRepetitions',
        source: 'custom',
        isArchived: false,
      },
      {
        ...metadata('visual-row'),
        name: 'Rowing barre',
        primaryMuscleGroup: 'back',
        secondaryMuscleGroups: ['biceps'],
        equipment: 'barbell',
        category: 'compound',
        movementType: 'pull',
        loadUnit: 'kg',
        trackingMode: 'loadRepetitions',
        source: 'custom',
        isArchived: false,
      },
    ];
    const sessionOffsets = [49, 35, 21, 14, 7, 2];
    const workoutSessions = sessionOffsets.map((offset, index) => ({
      ...metadata(`visual-session-${index}`),
      date: dateAgo(offset),
      status: 'completed',
      completedAt: now,
      durationMinutes: 58 + index,
      plannedDate: dateAgo(offset),
      plannedAt: now,
      strengthSessionStyle: 'classic',
    }));
    const workoutSessionExercises = sessionOffsets.flatMap((_, sessionIndex) => (
      exerciseDefinitions.map((exercise, exerciseIndex) => ({
        ...metadata(`visual-session-exercise-${sessionIndex}-${exerciseIndex}`),
        sessionId: `visual-session-${sessionIndex}`,
        exerciseDefinitionId: exercise.id,
        exerciseNameSnapshot: exercise.name,
        sortOrder: exerciseIndex,
        plannedSets: 3,
        minRepetitions: 6,
        maxRepetitions: 10,
        targetLoadKg: 60 + sessionIndex * 2,
        loadIncrementKg: 2.5,
        restSeconds: 120,
        loadUnitSnapshot: 'kg',
        trackingModeSnapshot: 'loadRepetitions',
      }))
    ));
    const strengthSets = workoutSessionExercises.flatMap((exercise, exerciseIndex) => (
      Array.from({ length: 3 }, (_, setIndex) => ({
        ...metadata(`visual-set-${exerciseIndex}-${setIndex}`),
        sessionId: exercise.sessionId,
        sessionExerciseId: exercise.id,
        setNumber: setIndex + 1,
        repetitions: 8 - setIndex % 2,
        weightKg:
          exercise.exerciseDefinitionId === 'visual-bench'
            ? 58 + Math.floor(exerciseIndex / 2) * 2 + setIndex
            : 52 + Math.floor(exerciseIndex / 2) * 2 + setIndex,
        rpe: 7 + setIndex * 0.5,
        type: 'working',
        isCompleted: true,
        completedAt: now,
      }))
    ));
    const earnedAchievements = seededAchievementIds.map((id) => ({
      id,
      earnedAt: now,
      updatedAt: now,
    }));
    const endurancePlanningSessions = activities
      .filter(({ type }) => type === 'cycling')
      .slice(0, 5)
      .map((activity, index) => ({
        ...metadata(`visual-plan-${index}`),
        title: `Sortie vélo ${index + 1}`,
        activityType: 'cycling',
        date: activity.date,
        intensity: activity.intensity,
        targetDurationMinutes: activity.durationMinutes,
        status: 'planned',
        completedActivityId: activity.id,
      }));

    const recordsByStore: Record<string, Record<string, unknown>[]> = {
      weights,
      dailySteps,
      activities,
      foodProducts,
      meals,
      foodEntries,
      dailyTargets,
      dailyJournalStatuses,
      dailyCheckIns,
      dailyCheckOuts,
      dailyActivityDecisions,
      exerciseDefinitions,
      workoutSessions,
      workoutSessionExercises,
      strengthSets,
      endurancePlanningSessions,
      earnedAchievements,
    };
    const storeNames = Object.keys(recordsByStore).filter((storeName) => (
      database.objectStoreNames.contains(storeName)
    ));
    const transaction = database.transaction(storeNames, 'readwrite');
    const completion = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    for (const storeName of storeNames) {
      transaction.objectStore(storeName).clear();
    }
    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      for (const record of recordsByStore[storeName] ?? []) {
        store.put(record);
      }
    }

    try {
      await completion;
    } finally {
      database.close();
    }
  }, {
    databaseName: DATABASE_NAME,
    achievementIds,
  });
}

interface VisualThemeStateOptions {
  activeThemeId: VisualQaTheme;
  unlockedThemeIds: VisualQaTheme[];
  appearance: 'light' | 'dark';
  pendingRevealThemeId?: VisualQaTheme;
}

export async function setVisualThemeState(
  page: Page,
  {
    activeThemeId,
    unlockedThemeIds,
    appearance,
    pendingRevealThemeId,
  }: VisualThemeStateOptions,
): Promise<void> {
  await waitForSportPilotDatabase(page);
  await page.evaluate(async ({
    databaseName,
    visualThemeStorageKey,
    visualThemeBootStorageKey,
    appearanceStorageKey,
    activeTheme,
    unlockedThemes,
    selectedAppearance,
    pendingTheme,
  }) => {
    const now = new Date().toISOString();
    const metadata = Object.fromEntries(unlockedThemes.flatMap((themeId) => (
      themeId === 'core'
        ? []
        : [[themeId, {
            unlockedAt: now,
            ...(themeId === pendingTheme ? {} : { revealSeenAt: now }),
          }]]
    )));
    const state = {
      activeThemeId: activeTheme,
      unlockedThemeIds: unlockedThemes,
      unlockMetadata: metadata,
    };
    if (pendingTheme) {
      localStorage.setItem(visualThemeStorageKey, JSON.stringify(state));
    } else {
      localStorage.removeItem(visualThemeStorageKey);
    }
    localStorage.setItem(visualThemeBootStorageKey, activeTheme);
    localStorage.setItem(appearanceStorageKey, selectedAppearance);

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stores = [
      'unlockedVisualThemes',
      'visualThemePreferences',
      'deviceSettings',
    ].filter(
      (storeName) => database.objectStoreNames.contains(storeName),
    );
    const transaction = database.transaction(stores, 'readwrite');
    const completion = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    if (stores.includes('unlockedVisualThemes')) {
      const store = transaction.objectStore('unlockedVisualThemes');
      store.clear();
      for (const themeId of unlockedThemes) {
        const themeMetadata = metadata[themeId] as
          | { unlockedAt: string; revealSeenAt?: string }
          | undefined;
        store.put({
          id: themeId,
          unlockedAt: themeMetadata?.unlockedAt ?? now,
          ...(themeMetadata?.revealSeenAt
            ? { revealSeenAt: themeMetadata.revealSeenAt }
            : {}),
          updatedAt: now,
        });
      }
    }
    if (stores.includes('visualThemePreferences')) {
      const store = transaction.objectStore('visualThemePreferences');
      store.clear();
      store.put({
        id: 'visual-theme-preference',
        activeThemeId: activeTheme,
        updatedAt: now,
      });
    }
    if (stores.includes('deviceSettings')) {
      const store = transaction.objectStore('deviceSettings');
      const request = store.get('device-settings');
      request.onsuccess = () => {
        if (!request.result) return;
        store.put({
          ...request.result,
          theme: selectedAppearance,
          updatedAt: now,
        });
      };
    }

    try {
      await completion;
    } finally {
      database.close();
    }
  }, {
    databaseName: DATABASE_NAME,
    visualThemeStorageKey: VISUAL_THEME_STORAGE_KEY,
    visualThemeBootStorageKey: VISUAL_THEME_BOOT_STORAGE_KEY,
    appearanceStorageKey: APPEARANCE_STORAGE_KEY,
    activeTheme: activeThemeId,
    unlockedThemes: unlockedThemeIds,
    selectedAppearance: appearance,
    pendingTheme: pendingRevealThemeId,
  });
}
