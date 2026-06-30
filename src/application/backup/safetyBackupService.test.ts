import {
  createAndDownloadSafetyBackup,
  createSafetyBackupFileName,
  SafetyBackupError,
} from '@/application/backup/safetyBackupService';
import type { PreparedBackupExport } from '@/application/backup/backupApplicationService';

function preparedBackup(): PreparedBackupExport {
  return {
    envelope: {
      format: 'sportpilot-backup',
      schemaVersion: 3,
      exportedAt: '2026-06-28T14:30:00.000Z',
      data: {
        userProfile: [],
        appSettings: [],
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
      },
    },
    fileName: 'sportpilot-backup.json',
    content: '{"format":"sportpilot-backup"}',
    summary: {
      sourceSchemaVersion: 3,
      schemaVersion: 3,
      requiresMigration: false,
      compatibility: 'compatible',
      exportedAt: '2026-06-28T14:30:00.000Z',
      appVersion: '0.16.0',
      totalRecords: 0,
      hasProfile: false,
      profileCount: 0,
      weights: 0,
      dailySteps: 0,
      activities: 0,
      foodProducts: 0,
      foodEntries: 0,
      recipes: 0,
      favoriteMeals: 0,
      weeklyReviews: 0,
      workoutSessions: 0,
      strengthSets: 0,
    },
  };
}

describe('safetyBackupService', () => {
  it('crée un nom explicite selon l’opération protégée', () => {
    expect(
      createSafetyBackupFileName(
        '2026-06-28T14:30:00.000Z',
        'before-import',
      ),
    ).toBe(
      'sportpilot-securite-avant-import-2026-06-28T14-30-00-000Z.json',
    );
  });

  it('prépare puis télécharge la sauvegarde avant la suite', async () => {
    const prepared = preparedBackup();
    const prepare = vi.fn().mockResolvedValue(prepared);
    const download = vi.fn();

    const result = await createAndDownloadSafetyBackup(
      'before-selective-reset',
      prepare,
      download,
    );

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith(
      prepared.content,
      'sportpilot-securite-avant-reinitialisation-2026-06-28T14-30-00-000Z.json',
      'application/json',
    );
    expect(result.reason).toBe('before-selective-reset');
  });

  it('annule l’opération destructive si la sauvegarde échoue', async () => {
    await expect(
      createAndDownloadSafetyBackup(
        'before-full-reset',
        () => Promise.reject(new Error('failure')),
        vi.fn(),
      ),
    ).rejects.toBeInstanceOf(SafetyBackupError);
  });
});
