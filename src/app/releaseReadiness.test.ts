import { routePaths } from '@/app/routePaths';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion, databaseTableNames } from '@/infrastructure/database/schema';

describe('préparation de la release 0.14.0', () => {
  it('expose une version stable dans le build', () => {
    expect(__APP_VERSION__).toBe('0.14.0');
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('conserve les versions de schéma attendues', () => {
    expect(databaseSchemaVersion).toBe(2);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(2);
    expect(databaseTableNames).toEqual(expect.arrayContaining([
      'exerciseDefinitions',
      'workoutTemplates',
      'workoutTemplateExercises',
      'workoutSessions',
      'workoutSessionExercises',
      'strengthSets',
      'progressionSuggestions',
    ]));
  });

  it('expose tous les parcours du carnet de musculation', () => {
    expect(routePaths.strengthExercises).toBe('/strength/exercises');
    expect(routePaths.workoutTemplates).toBe('/strength/templates');
    expect(routePaths.workoutSessions).toBe('/strength/sessions');
    expect(routePaths.strengthExerciseHistory).toContain('/history');
  });
});
