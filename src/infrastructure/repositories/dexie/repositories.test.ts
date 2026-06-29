import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieActivityRepository } from '@/infrastructure/repositories/dexie/DexieActivityRepository';
import { DexieProfileRepository } from '@/infrastructure/repositories/dexie/DexieProfileRepository';
import { DexieSettingsRepository } from '@/infrastructure/repositories/dexie/DexieSettingsRepository';
import { DexieStepsRepository } from '@/infrastructure/repositories/dexie/DexieStepsRepository';
import { DexieWeightRepository } from '@/infrastructure/repositories/dexie/DexieWeightRepository';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import {
  dailyStepsIdForDate,
  weightEntryIdForDate,
} from '@/domain/sync/deterministicEntityIds';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import { createProfileInput } from '@/test/factories/profileFactory';

function createTestDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-repository-test-${crypto.randomUUID()}`);
}

describe('repositories Dexie', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('enregistre puis met à jour le profil local sans créer de doublon', async () => {
    const repository = new DexieProfileRepository(database);

    const created = await repository.save(createProfileInput());
    const updated = await repository.save(createProfileInput({ firstName: 'SupraBoss' }));

    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.firstName).toBe('SupraBoss');
    expect(await database.userProfile.count()).toBe(1);
  });

  it('remplace la pesée du même jour en conservant son identifiant', async () => {
    const repository = new DexieWeightRepository(database);

    const first = await repository.upsert({ date: '2026-06-23', weightKg: 60 });
    const second = await repository.upsert({ date: '2026-06-23', weightKg: 59.8 });

    expect(first.id).toBe(weightEntryIdForDate('2026-06-23'));
    expect(second.id).toBe(first.id);
    expect(second.weightKg).toBe(59.8);
    expect(await database.weights.count()).toBe(1);
  });

  it('conserve une seule saisie de pas par date', async () => {
    const repository = new DexieStepsRepository(database);

    const created = await repository.upsert({
      date: '2026-06-23',
      totalSteps: 8_000,
      source: 'manual',
    });
    const updated = await repository.upsert({
      date: '2026-06-23',
      totalSteps: 10_500,
      source: 'manual',
    });

    expect(created.id).toBe(dailyStepsIdForDate('2026-06-23'));
    expect(updated.id).toBe(created.id);
    expect(updated.totalSteps).toBe(10_500);
    expect(await database.dailySteps.count()).toBe(1);
  });

  it('complète les réglages de sauvegarde absents d’une ancienne base', async () => {
    const repository = new DexieSettingsRepository(database);
    const legacy = createDefaultAppSettings() as unknown as Record<string, unknown>;
    delete legacy.backupReminderIntervalDays;
    delete legacy.restTimerAutoStart;
    delete legacy.restTimerSoundEnabled;
    delete legacy.restTimerVibrationEnabled;
    await database.appSettings.put(legacy as never);

    const settings = await repository.get();

    expect(settings.backupReminderIntervalDays).toBe(0);
    expect(settings.restTimerAutoStart).toBe(true);
    expect(settings.restTimerSoundEnabled).toBe(false);
    expect(settings.restTimerVibrationEnabled).toBe(true);
    const stored = (await database.appSettings.toArray())[0];
    expect(stored?.backupReminderIntervalDays).toBe(0);
    expect(stored?.restTimerAutoStart).toBe(true);
    expect(stored?.restTimerSoundEnabled).toBe(false);
    expect(stored?.restTimerVibrationEnabled).toBe(true);
  });

  it('enregistre et retrouve les activités d’une journée', async () => {
    const repository = new DexieActivityRepository(database);

    const activity = await repository.create(createRunningActivityInput());
    const activities = await repository.listByDate('2026-06-23');

    expect(activities).toHaveLength(1);
    expect(activities[0]).toEqual(activity);
  });
});
