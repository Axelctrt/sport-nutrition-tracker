import { createEntity } from '@/shared/utils/entities';
import {
  createCsvExports,
  type CsvExportOptions,
} from '@/infrastructure/backup/csvExportService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { WeightEntry } from '@/domain/models/weight';

const databaseName =
  'sportpilot-advanced-csv-export-test';
let database: AppDatabase;

beforeEach(async () => {
  database = new AppDatabase(databaseName);
  await database.open();
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe('createCsvExports avec options', () => {
  it('filtre la période et les jeux de données sélectionnés', async () => {
    await database.weights.bulkAdd([
      createEntity({
        date: '2026-05-01',
        weightKg: 61,
      }) as WeightEntry,
      createEntity({
        date: '2026-06-20',
        weightKg: 60.4,
      }) as WeightEntry,
      createEntity({
        date: '2026-06-28',
        weightKg: 60.2,
      }) as WeightEntry,
    ]);

    const options: CsvExportOptions = {
      from: '2026-06-01',
      to: '2026-06-28',
      keys: ['weights'],
    };

    const exports = await createCsvExports(
      database,
      '2026-06-28T12:00:00.000Z',
      options,
    );

    expect(exports).toHaveLength(1);
    expect(exports[0]).toEqual(
      expect.objectContaining({
        key: 'weights',
        rowCount: 2,
        fileName:
          'sportpilot-poids-20260628-2026-06-01-2026-06-28.csv',
      }),
    );
    expect(exports[0]?.content).toContain('60.4');
    expect(exports[0]?.content).toContain('60.2');
    expect(exports[0]?.content).not.toContain('61');
  });

  it('refuse une période inversée', async () => {
    await expect(
      createCsvExports(
        database,
        '2026-06-28T12:00:00.000Z',
        {
          from: '2026-06-28',
          to: '2026-06-01',
        },
      ),
    ).rejects.toThrow(
      'La date de début de l’export CSV doit précéder la date de fin.',
    );
  });

  it('conserve le comportement historique sans options', async () => {
    const exports = await createCsvExports(
      database,
      '2026-06-28T12:00:00.000Z',
    );

    expect(exports).toHaveLength(7);
    expect(exports.map(({ key }) => key)).toEqual([
      'weights',
      'steps',
      'activities',
      'workoutSessions',
      'strengthSets',
      'foodEntries',
      'dailyNutrition',
    ]);
  });
});
