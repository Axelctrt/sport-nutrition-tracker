import Dexie from 'dexie';

import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  DEFAULT_DATABASE_NAME,
  accountDatabaseNameForFingerprint,
} from '@/infrastructure/database/databaseNames';
import { DexieActivityRepository } from '@/infrastructure/repositories/dexie/DexieActivityRepository';
import { DexieFoodRepository } from '@/infrastructure/repositories/dexie/DexieFoodRepository';
import { DexieProfileRepository } from '@/infrastructure/repositories/dexie/DexieProfileRepository';
import { DexieTargetRepository } from '@/infrastructure/repositories/dexie/DexieTargetRepository';
import { DexieWeightRepository } from '@/infrastructure/repositories/dexie/DexieWeightRepository';
import { DexieWorkoutSessionRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutSessionRepository';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createWorkoutSessionInput } from '@/test/factories/strengthFactory';

const ACCOUNT_A_DATABASE = accountDatabaseNameForFingerprint('acct-a4a4a4a4');
const ACCOUNT_B_DATABASE = accountDatabaseNameForFingerprint('acct-b4b4b4b4');
const GUEST_TEST_DATABASE = `${DEFAULT_DATABASE_NAME}--a4-isolation-test`;

const databaseNames = [
  ACCOUNT_A_DATABASE,
  ACCOUNT_B_DATABASE,
  GUEST_TEST_DATABASE,
] as const;

async function deleteTestDatabases(): Promise<void> {
  for (const databaseName of databaseNames) {
    if (await Dexie.exists(databaseName)) {
      await Dexie.delete(databaseName);
    }
  }
}

function createRepositories(database: AppDatabase) {
  return {
    profile: new DexieProfileRepository(database),
    weight: new DexieWeightRepository(database),
    activities: new DexieActivityRepository(database),
    food: new DexieFoodRepository(database),
    workouts: new DexieWorkoutSessionRepository(database),
    targets: new DexieTargetRepository(database),
  };
}

describe('isolation physique des espaces de données', () => {
  beforeEach(deleteTestDatabases);
  afterEach(deleteTestDatabases);

  it('utilise trois bases IndexedDB distinctes pour l’invité et deux comptes', () => {
    expect(new Set(databaseNames).size).toBe(3);
    expect(ACCOUNT_A_DATABASE).not.toBe(ACCOUNT_B_DATABASE);
    expect(ACCOUNT_A_DATABASE).not.toBe(DEFAULT_DATABASE_NAME);
    expect(ACCOUNT_B_DATABASE).not.toBe(DEFAULT_DATABASE_NAME);
  });

  it('empêche les données du compte A d’apparaître dans le compte B ou l’espace invité', async () => {
    const accountA = new AppDatabase(ACCOUNT_A_DATABASE);
    const accountB = new AppDatabase(ACCOUNT_B_DATABASE);
    const guest = new AppDatabase(GUEST_TEST_DATABASE);
    await Promise.all([accountA.open(), accountB.open(), guest.open()]);

    const a = createRepositories(accountA);
    const b = createRepositories(accountB);
    const guestRepositories = createRepositories(guest);

    await a.profile.save(createProfileInput({ firstName: 'Compte A' }));
    await a.weight.upsert({ date: '2026-07-01', weightKg: 61.2 });
    await a.activities.create(
      createRunningActivityInput({ date: '2026-07-01', distanceKm: 8 }),
    );
    await a.food.createProduct({
      name: 'Produit du compte A',
      basisUnit: 'g',
      nutritionPer100: {
        caloriesKcal: 120,
        proteinGrams: 8,
        carbohydratesGrams: 14,
        fatGrams: 4,
      },
      source: { type: 'manual' },
      isNutritionComplete: true,
      isFavorite: false,
      isArchived: false,
    });
    await a.workouts.createWithExercises(
      createWorkoutSessionInput({ date: '2026-07-01' }),
      [],
    );
    await a.targets.upsertTarget({
      date: '2026-07-01',
      calculationWeightKg: 61.2,
      energy: {
        bmrKcal: 1_500,
        occupationalBaseKcal: 300,
        walkingKcal: 200,
        runningKcal: 450,
        swimmingKcal: 0,
        strengthTrainingKcal: 0,
        otherActivitiesKcal: 0,
        totalEstimatedExpenditureKcal: 2_450,
      },
      goalAdjustmentKcal: 0,
      acceptedCalibrationAdjustmentKcal: 0,
      calorieFloorKcal: 1_700,
      targetCaloriesKcal: 2_450,
      macros: {
        proteinGrams: 120,
        carbohydratesGrams: 300,
        fatGrams: 70,
      },
      calculationVersion: 1,
    });

    expect(await b.profile.get()).toBeUndefined();
    expect(await b.weight.listAll()).toEqual([]);
    expect(await b.activities.listByDate('2026-07-01')).toEqual([]);
    expect(await b.food.listProducts()).toEqual([]);
    expect(await b.workouts.listAll()).toEqual([]);
    expect(await b.targets.getTargetByDate('2026-07-01')).toBeUndefined();

    expect(await guestRepositories.profile.get()).toBeUndefined();
    expect(await guestRepositories.weight.listAll()).toEqual([]);
    expect(await guestRepositories.activities.listByDate('2026-07-01')).toEqual([]);
    expect(await guestRepositories.food.listProducts()).toEqual([]);
    expect(await guestRepositories.workouts.listAll()).toEqual([]);
    expect(
      await guestRepositories.targets.getTargetByDate('2026-07-01'),
    ).toBeUndefined();

    await b.profile.save(createProfileInput({ firstName: 'Compte B' }));
    await b.weight.upsert({ date: '2026-07-01', weightKg: 74.8 });

    expect((await a.profile.get())?.firstName).toBe('Compte A');
    expect((await b.profile.get())?.firstName).toBe('Compte B');
    expect((await a.weight.getByDate('2026-07-01'))?.weightKg).toBe(61.2);
    expect((await b.weight.getByDate('2026-07-01'))?.weightKg).toBe(74.8);

    accountA.close();
    accountB.close();
    guest.close();
  });
});
