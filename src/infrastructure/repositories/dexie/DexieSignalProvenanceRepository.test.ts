import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { CURRENT_DATABASE_VERSION } from '@/infrastructure/database/migrations/versions';
import { DexieDailyCoachingRepository } from '@/infrastructure/repositories/dexie/DexieDailyCoachingRepository';
import { DexieWeightRepository } from '@/infrastructure/repositories/dexie/DexieWeightRepository';

describe('persistance Dexie des provenances Coach C0.2', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = new AppDatabase(`signal-provenance-${crypto.randomUUID()}`);
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('conserve les provenances optionnelles sans nouvelle version AppDatabase', async () => {
    const weightRepository = new DexieWeightRepository(database);
    const dailyRepository = new DexieDailyCoachingRepository(database);

    await weightRepository.upsert({
      date: '2026-08-25',
      weightKg: 71.2,
      provenance: 'userMeasurement',
    });
    await dailyRepository.upsertCheckIn({
      date: '2026-08-25',
      sleepQuality: 'good',
      signalProvenance: { sleepQuality: 'userReported' },
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-08-25T06:00:00.000Z',
    });
    await dailyRepository.upsertCheckOut({
      date: '2026-08-25',
      hunger: 'normal',
      signalProvenance: { hunger: 'userReported' },
      foodJournalComplete: true,
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-08-25T20:00:00.000Z',
    });

    expect(database.verno).toBe(CURRENT_DATABASE_VERSION);
    expect(CURRENT_DATABASE_VERSION).toBe(13);
    expect((await database.weights.toArray())[0]?.provenance).toBe('userMeasurement');
    expect((await database.dailyCheckIns.toArray())[0]?.signalProvenance)
      .toEqual({ sleepQuality: 'userReported' });
    expect((await database.dailyCheckOuts.toArray())[0]?.signalProvenance)
      .toEqual({ hunger: 'userReported' });
  });

  it('laisse les lignes legacy sans provenance', async () => {
    const weightRepository = new DexieWeightRepository(database);
    const dailyRepository = new DexieDailyCoachingRepository(database);

    const weight = await weightRepository.upsert({ date: '2026-08-24', weightKg: 71.5 });
    const checkIn = await dailyRepository.upsertCheckIn({
      date: '2026-08-24',
      readiness: 'normal',
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-08-24T06:00:00.000Z',
    });

    expect(weight.provenance).toBeUndefined();
    expect(checkIn.signalProvenance).toBeUndefined();
  });
});
