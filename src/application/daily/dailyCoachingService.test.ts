import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  completeDailyCheckIn,
  completeDailyCheckOut,
  readDailyCoachingDay,
  setDailyActivityDecision,
  type DailyCoachingServiceDependencies,
} from '@/application/daily/dailyCoachingService';
import {
  dailyCheckInIdForDate,
  dailyCheckOutIdForDate,
  dailyStepsIdForDate,
  weightEntryIdForDate,
} from '@/domain/sync/deterministicEntityIds';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieDailyCoachingRepository } from '@/infrastructure/repositories/dexie/DexieDailyCoachingRepository';
import { DexieFoodRepository } from '@/infrastructure/repositories/dexie/DexieFoodRepository';
import { DexieStepsRepository } from '@/infrastructure/repositories/dexie/DexieStepsRepository';
import { DexieWeightRepository } from '@/infrastructure/repositories/dexie/DexieWeightRepository';

describe('dailyCoachingService', () => {
  let database: AppDatabase;
  let dependencies: DailyCoachingServiceDependencies;

  beforeEach(async () => {
    database = new AppDatabase(`daily-coaching-service-${crypto.randomUUID()}`);
    await database.open();
    dependencies = {
      dailyCoaching: new DexieDailyCoachingRepository(database),
      weight: new DexieWeightRepository(database),
      steps: new DexieStepsRepository(database),
      food: new DexieFoodRepository(database),
      now: () => '2026-07-29T20:00:00.000Z',
    };
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('enregistre le check-in et référence la pesée canonique', async () => {
    const checkIn = await completeDailyCheckIn({
      date: '2026-07-29',
      weightKg: 61.5,
      sleepDurationMinutes: 450,
      sleepQuality: 'good',
      readiness: 'high',
      contextFlags: ['travel', 'travel'],
    }, dependencies);

    expect(checkIn).toMatchObject({
      id: dailyCheckInIdForDate('2026-07-29'),
      weightEntryId: weightEntryIdForDate('2026-07-29'),
      contextFlags: ['travel'],
      contextSyncPreference: 'localOnly',
    });
    expect(await database.weights.get(weightEntryIdForDate('2026-07-29')))
      .toMatchObject({ weightKg: 61.5 });
  });

  it('autorise un check-in sans pesée et efface seulement sa référence', async () => {
    await completeDailyCheckIn({
      date: '2026-07-29',
      weightKg: 61.5,
    }, dependencies);
    const updated = await completeDailyCheckIn({
      date: '2026-07-29',
      weightKg: null,
      readiness: 'normal',
    }, dependencies);

    expect(updated.weightEntryId).toBeUndefined();
    expect(await database.weights.count()).toBe(1);
  });

  it('réouvre une décision sportive sans conserver une confirmation obsolète', async () => {
    await setDailyActivityDecision({
      date: '2026-07-29',
      decision: 'rest',
    }, dependencies);
    const open = await setDailyActivityDecision({
      date: '2026-07-29',
      decision: 'open',
    }, dependencies);

    expect(open).toMatchObject({ decision: 'open' });
    expect(open.confirmedAt).toBeUndefined();
  });

  it('enregistre les pas du check-out et clôt le journal canonique', async () => {
    const checkOut = await completeDailyCheckOut({
      date: '2026-07-29',
      actualSteps: 8_750,
      hunger: 'normal',
      energy: 'high',
      foodJournalComplete: true,
    }, dependencies);

    expect(checkOut).toMatchObject({
      id: dailyCheckOutIdForDate('2026-07-29'),
      stepsEntryId: dailyStepsIdForDate('2026-07-29'),
      foodJournalComplete: true,
    });
    expect(await database.dailySteps.get(dailyStepsIdForDate('2026-07-29')))
      .toMatchObject({ totalSteps: 8_750 });
    expect(await database.dailyJournalStatuses
      .where('date')
      .equals('2026-07-29')
      .first()).toMatchObject({
        isComplete: true,
        completedAt: '2026-07-29T20:00:00.000Z',
      });
  });

  it('accepte un check-out sans pas sans fabriquer une valeur nulle', async () => {
    const checkOut = await completeDailyCheckOut({
      date: '2026-07-29',
      actualSteps: null,
      foodJournalComplete: false,
    }, dependencies);
    const day = await readDailyCoachingDay('2026-07-29', dependencies);

    expect(checkOut.stepsEntryId).toBeUndefined();
    expect(await database.dailySteps.count()).toBe(0);
    expect(day.checkOut?.id).toBe(checkOut.id);
  });

  it('relit les check-ins et check-outs sur une période bornée', async () => {
    await completeDailyCheckIn({ date: '2026-07-20', readiness: 'normal' }, dependencies);
    await completeDailyCheckIn({ date: '2026-07-29', readiness: 'high' }, dependencies);
    await completeDailyCheckOut({
      date: '2026-07-29',
      foodJournalComplete: true,
    }, dependencies);

    await expect(dependencies.dailyCoaching.listCheckInsBetween(
      '2026-07-21',
      '2026-07-31',
    )).resolves.toHaveLength(1);
    await expect(dependencies.dailyCoaching.listCheckOutsBetween(
      '2026-07-21',
      '2026-07-31',
    )).resolves.toHaveLength(1);
  });
});
