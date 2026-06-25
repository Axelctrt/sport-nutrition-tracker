import {
  decideProgressionSuggestion,
  generateProgressionSuggestions,
} from '@/application/strength/strengthProgressionService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieProgressionSuggestionRepository } from '@/infrastructure/repositories/dexie/DexieProgressionSuggestionRepository';
import { DexieStrengthSetRepository } from '@/infrastructure/repositories/dexie/DexieStrengthSetRepository';
import { DexieWorkoutSessionRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutSessionRepository';
import { DexieWorkoutTemplateRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutTemplateRepository';
import { createEntity } from '@/shared/utils/entities';
import {
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
  createWorkoutTemplateExerciseInput,
  createWorkoutTemplateInput,
} from '@/test/factories/strengthFactory';

describe('strengthProgressionService', () => {
  let database: AppDatabase;
  let sessionRepository: DexieWorkoutSessionRepository;
  let setRepository: DexieStrengthSetRepository;
  let suggestionRepository: DexieProgressionSuggestionRepository;
  let templateRepository: DexieWorkoutTemplateRepository;

  beforeEach(async () => {
    database = new AppDatabase(`sportpilot-progression-${crypto.randomUUID()}`);
    await database.open();
    sessionRepository = new DexieWorkoutSessionRepository(database);
    setRepository = new DexieStrengthSetRepository(database);
    suggestionRepository = new DexieProgressionSuggestionRepository(database);
    templateRepository = new DexieWorkoutTemplateRepository(database);

    await database.workoutTemplates.add(createEntity(
      createWorkoutTemplateInput({ name: 'Push A' }),
      'template-1',
    ));
    await database.workoutTemplateExercises.add(createEntity(
      createWorkoutTemplateExerciseInput({
        templateId: 'template-1',
        exerciseDefinitionId: 'exercise-1',
        plannedSets: 4,
        maxRepetitions: 12,
        targetLoadKg: 60,
        loadIncrementKg: 2.5,
        maximumRecommendedRpe: 9,
      }),
      'template-exercise-1',
    ));
    await database.workoutSessions.add(createEntity(
      createWorkoutSessionInput({
        status: 'completed',
        sourceTemplateId: 'template-1',
      }),
      'session-1',
    ));
    await database.workoutSessionExercises.add(createEntity(
      createWorkoutSessionExerciseInput({
        sessionId: 'session-1',
        sourceTemplateExerciseId: 'template-exercise-1',
        plannedSets: 4,
        maxRepetitions: 12,
        targetLoadKg: 60,
        loadIncrementKg: 2.5,
        maximumRecommendedRpe: 9,
      }),
      'session-exercise-1',
    ));
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  async function addWorkingSets(
    repetitions: number[] = [12, 12, 12, 12],
    rpes: Array<number | undefined> = [8, 8.5, 9, 9],
  ) {
    await database.strengthSets.bulkAdd(repetitions.map((value, index) => {
      const rpe = rpes[index];
      const input = createStrengthSetInput({
        sessionId: 'session-1',
        sessionExerciseId: 'session-exercise-1',
        setNumber: index + 1,
        repetitions: value,
        weightKg: 60,
        type: 'working',
        isCompleted: true,
        ...(rpe === undefined ? {} : { rpe }),
      });
      if (rpe === undefined) delete input.rpe;
      return createEntity(input, `set-${index + 1}`);
    }));
  }

  it('propose une augmentation lorsque toutes les séries prévues atteignent la borne haute', async () => {
    await addWorkingSets();

    const suggestions = await generateProgressionSuggestions(
      sessionRepository,
      setRepository,
      suggestionRepository,
      'session-1',
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      currentLoadKg: 60,
      suggestedLoadKg: 62.5,
      incrementKg: 2.5,
      status: 'pending',
    });

    const secondRun = await generateProgressionSuggestions(
      sessionRepository,
      setRepository,
      suggestionRepository,
      'session-1',
    );
    expect(secondRun).toHaveLength(1);
    expect(await database.progressionSuggestions.count()).toBe(1);
  });

  it('ne propose rien si les répétitions ou le RPE ne respectent pas les critères', async () => {
    await addWorkingSets([12, 12, 11, 12]);
    expect(await generateProgressionSuggestions(
      sessionRepository,
      setRepository,
      suggestionRepository,
      'session-1',
    )).toEqual([]);

    await database.strengthSets.clear();
    await addWorkingSets([12, 12, 12, 12], [8, 8.5, 9.5, 9]);
    expect(await generateProgressionSuggestions(
      sessionRepository,
      setRepository,
      suggestionRepository,
      'session-1',
    )).toEqual([]);
  });


  it('ne propose rien si une série de travail prévue n’est pas validée', async () => {
    await addWorkingSets();
    await database.strengthSets.update('set-3', { isCompleted: false });

    expect(await generateProgressionSuggestions(
      sessionRepository,
      setRepository,
      suggestionRepository,
      'session-1',
    )).toEqual([]);
  });

  it('exige un RPE renseigné lorsqu’une limite est configurée', async () => {
    await addWorkingSets([12, 12, 12, 12], [8, 8.5, undefined, 9]);

    expect(await generateProgressionSuggestions(
      sessionRepository,
      setRepository,
      suggestionRepository,
      'session-1',
    )).toEqual([]);
  });

  it('accepte une charge choisie et met à jour uniquement la cible du modèle', async () => {
    await addWorkingSets();
    const [suggestion] = await generateProgressionSuggestions(
      sessionRepository,
      setRepository,
      suggestionRepository,
      'session-1',
    );

    const accepted = await decideProgressionSuggestion(
      suggestionRepository,
      templateRepository,
      suggestion!.id,
      'accepted',
      63,
    );

    expect(accepted).toMatchObject({ status: 'accepted', suggestedLoadKg: 63 });
    expect(accepted.appliedAt).toBeDefined();
    expect((await database.workoutTemplateExercises.get('template-exercise-1'))?.targetLoadKg).toBe(63);
    expect((await database.workoutSessionExercises.get('session-exercise-1'))?.targetLoadKg).toBe(60);
  });

  it('refuse ou reporte sans modifier la séance modèle', async () => {
    await addWorkingSets();
    const [firstSuggestion] = await generateProgressionSuggestions(
      sessionRepository,
      setRepository,
      suggestionRepository,
      'session-1',
    );

    const deferred = await decideProgressionSuggestion(
      suggestionRepository,
      templateRepository,
      firstSuggestion!.id,
      'deferred',
    );
    expect(deferred.status).toBe('deferred');
    expect((await database.workoutTemplateExercises.get('template-exercise-1'))?.targetLoadKg).toBe(60);

    const rejected = await decideProgressionSuggestion(
      suggestionRepository,
      templateRepository,
      firstSuggestion!.id,
      'rejected',
    );
    expect(rejected.status).toBe('rejected');
    await expect(decideProgressionSuggestion(
      suggestionRepository,
      templateRepository,
      firstSuggestion!.id,
      'accepted',
    )).rejects.toThrow(/déjà reçu/);
  });
});
