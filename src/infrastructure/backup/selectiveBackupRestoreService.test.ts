import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type {
  BackupData,
  BackupEnvelope,
} from '@/domain/models/backup';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import {
  applySelectiveBackupRestore,
  createSelectiveRestorePreview,
  type PreparedSelectiveBackupRestore,
} from '@/infrastructure/backup/selectiveBackupRestoreService';
import { createEntity } from '@/shared/utils/entities';

function emptyData(): BackupData {
  return {
    userProfile: [],
    appSettings: [createDefaultAppSettings()],
    weights: [],
    dailySteps: [],
    activities: [],
    foodProducts: [],
    meals: [],
    foodEntries: [],
    favoriteMeals: [],
    recipes: [],
    recipeIngredients: [],
    dailyTargets: [],
    dailyJournalStatuses: [],
    weeklyReviews: [],
    acceptedCalorieAdjustments: [],
    exerciseDefinitions: [],
    workoutTemplates: [],
    workoutTemplateExercises: [],
    workoutSessions: [],
    workoutSessionExercises: [],
    strengthSets: [],
    progressionSuggestions: [],
  };
}

function createEnvelope(
  data: BackupData,
): BackupEnvelope {
  return {
    format: 'sportpilot-backup',
    schemaVersion: 3,
    exportedAt: '2026-06-28T16:00:00.000Z',
    appVersion: '0.16.0',
    data,
  };
}

function createPrepared(
  envelope: BackupEnvelope,
): PreparedSelectiveBackupRestore {
  return createSelectiveRestorePreview(
    emptyData(),
    envelope,
  );
}

describe('selectiveBackupRestoreService', () => {
  it('compare les compteurs locaux et entrants par domaine', () => {
    const current = emptyData();
    current.weights = [
      createEntity(
        { date: '2026-06-01', weightKg: 80 },
        'weight-current',
      ),
    ];

    const incoming = emptyData();
    incoming.weights = [
      createEntity(
        { date: '2026-06-20', weightKg: 79 },
        'weight-1',
      ),
      createEntity(
        { date: '2026-06-28', weightKg: 78.5 },
        'weight-2',
      ),
    ];

    const preview = createSelectiveRestorePreview(
      current,
      createEnvelope(incoming),
    );

    expect(
      preview.categories.find(
        ({ key }) => key === 'bodyTracking',
      ),
    ).toEqual(
      expect.objectContaining({
        currentRecords: 1,
        incomingRecords: 2,
        available: true,
      }),
    );

    expect(
      preview.categories.find(
        ({ key }) => key === 'rewards',
      ),
    ).toEqual(
      expect.objectContaining({
        incomingRecords: 0,
        available: false,
      }),
    );
  });

  it('remplace uniquement le domaine sélectionné', async () => {
    const database = new AppDatabase(
      `sportpilot-selective-restore-${crypto.randomUUID()}`,
    );
    await initializeDatabase(database);

    try {
      await database.weights.add(
        createEntity(
          { date: '2026-06-01', weightKg: 80 },
          'weight-old',
        ),
      );
      await database.dailySteps.add(
        createEntity(
          {
            date: '2026-06-01',
            totalSteps: 4_000,
            source: 'manual' as const,
          },
          'steps-old',
        ),
      );

      const incoming = emptyData();
      incoming.weights = [
        createEntity(
          { date: '2026-06-28', weightKg: 78.5 },
          'weight-new',
        ),
      ];

      const envelope = createEnvelope(incoming);
      const prepared = createPrepared(envelope);

      await applySelectiveBackupRestore(
        prepared,
        ['bodyTracking'],
        database,
      );

      expect(await database.weights.toArray()).toEqual([
        expect.objectContaining({
          id: 'weight-new',
          weightKg: 78.5,
        }),
      ]);
      expect(await database.dailySteps.count()).toBe(0);
      expect(await database.appSettings.count()).toBe(1);
      expect(
        await database.exerciseDefinitions.count(),
      ).toBeGreaterThan(0);
    } finally {
      database.close();
      await database.delete();
    }
  });

  it('refuse une sélection vide ou indisponible', async () => {
    const prepared = createPrepared(
      createEnvelope(emptyData()),
    );

    await expect(
      applySelectiveBackupRestore(prepared, []),
    ).rejects.toThrow(
      'Sélectionne au moins un domaine',
    );

    await expect(
      applySelectiveBackupRestore(
        prepared,
        ['rewards'],
      ),
    ).rejects.toThrow(
      'La sauvegarde ne contient pas',
    );
  });
});
