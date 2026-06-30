import { createCsvContent, createCsvExports } from '@/infrastructure/backup/csvExportService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { createDefaultDeviceSettings, createDefaultUserSettings } from '@/domain/defaults/appSettings';
import { createEntity } from '@/shared/utils/entities';
import type { CyclingActivity, SwimmingActivity } from '@/domain/models/activity';
import type { WeightEntry } from '@/domain/models/weight';
import type { WorkoutSession } from '@/domain/models/strength';

const databaseName = 'sportpilot-csv-export-test';
let database: AppDatabase;

beforeEach(async () => {
  database = new AppDatabase(databaseName);
  await database.open();
  await database.userSettings.put(createDefaultUserSettings());
  await database.deviceSettings.put(createDefaultDeviceSettings());
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe('createCsvContent', () => {
  it('gère les accents, guillemets, séparateurs et retours à la ligne', () => {
    const content = createCsvContent(
      ['nom', 'note'],
      [['Crème brûlée', 'Texte; avec "guillemets"\net retour']],
    );

    expect(content.startsWith('\uFEFF')).toBe(true);
    expect(content).toContain('Crème brûlée');
    expect(content).toContain('"Texte; avec ""guillemets""\net retour"');
  });
});

describe('createCsvExports', () => {
  it('produit les sept exports attendus avec les données locales', async () => {
    const weight = createEntity<WeightEntry>({
      date: '2026-06-26',
      weightKg: 69.4,
      note: 'Après entraînement',
    });
    await database.weights.add(weight);
    await database.activities.bulkAdd([
      createEntity<SwimmingActivity>({
        type: 'swimming',
        date: '2026-06-26',
        durationMinutes: 40,
        intensity: 'moderate',
        sessionType: 'endurance',
        mainStroke: 'freestyle',
        distanceMeters: 1_500,
        poolLengthMeters: 25,
        intervalDetails: '3 × 500 m',
        calculation: { weightKg: 69.4, estimatedCaloriesKcal: 350, calculationVersion: 1 },
      }, 'swimming-1'),
      createEntity<CyclingActivity>({
        type: 'cycling',
        date: '2026-06-26',
        durationMinutes: 90,
        intensity: 'moderate',
        met: 6.8,
        includedInDailySteps: false,
        distanceKm: 36,
        elevationGainMeters: 420,
        bikeType: 'road',
        environment: 'outdoor',
        calculation: {
          weightKg: 69.4,
          estimatedCaloriesKcal: 700,
          metUsed: 6.8,
          calculationVersion: 1,
        },
      }, 'cycling-1'),
    ]);
    await database.workoutSessions.add(createEntity<WorkoutSession>({
      date: '2026-06-30',
      status: 'planned',
      plannedDate: '2026-06-30',
      originalPlannedDate: '2026-06-29',
      plannedAt: '2026-06-26T12:00:00.000Z',
      sourceTemplateNameSnapshot: 'Push A',
    }, 'planned-session'));

    const exports = await createCsvExports(database, '2026-06-26T12:00:00.000Z');

    expect(exports).toHaveLength(7);
    expect(exports.map((item) => item.key)).toEqual([
      'weights',
      'steps',
      'activities',
      'workoutSessions',
      'strengthSets',
      'foodEntries',
      'dailyNutrition',
    ]);
    expect(exports[0]?.content).toContain('69.4');
    expect(exports[0]?.content).toContain('Après entraînement');
    expect(exports[3]?.content).toContain('date_prevue_initiale');
    expect(exports[3]?.content).toContain('2026-06-29');
    expect(exports[2]?.content).toContain('longueur_bassin_m');
    expect(exports[2]?.content).toContain('nombre_longueurs');
    expect(exports[2]?.content).toContain('3 × 500 m');
    expect(exports[2]?.content).toContain('road');
    expect(exports[2]?.content).toContain('outdoor');
    expect(exports[2]?.content).toContain('24');
    expect(exports[2]?.content).toContain('60');
    expect(exports[3]?.content).toContain('planned');
  });
});
