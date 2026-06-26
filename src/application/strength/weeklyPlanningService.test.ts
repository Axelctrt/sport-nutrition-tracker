import {
  getWeekStart,
  listWeeklyPlanning,
  planWorkoutSessionFromTemplate,
  planningDateForSession,
  reschedulePlannedWorkoutSession,
  skipPlannedWorkoutSession,
  startPlannedWorkoutSession,
} from '@/application/strength/weeklyPlanningService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieStrengthExerciseRepository } from '@/infrastructure/repositories/dexie/DexieStrengthExerciseRepository';
import { DexieWorkoutSessionRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutSessionRepository';
import { DexieWorkoutTemplateRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutTemplateRepository';
import { createEntity } from '@/shared/utils/entities';
import {
  createExerciseDefinitionInput,
  createWorkoutTemplateExerciseInput,
  createWorkoutTemplateInput,
} from '@/test/factories/strengthFactory';

describe('weeklyPlanningService', () => {
  let database: AppDatabase;
  let sessionRepository: DexieWorkoutSessionRepository;
  let templateRepository: DexieWorkoutTemplateRepository;
  let exerciseRepository: DexieStrengthExerciseRepository;

  beforeEach(async () => {
    database = new AppDatabase(`sportpilot-weekly-planning-${crypto.randomUUID()}`);
    await database.open();
    sessionRepository = new DexieWorkoutSessionRepository(database);
    templateRepository = new DexieWorkoutTemplateRepository(database);
    exerciseRepository = new DexieStrengthExerciseRepository(database);

    await database.exerciseDefinitions.add(createEntity(
      createExerciseDefinitionInput({ name: 'Développé couché' }),
      'exercise-bench',
    ));
    await database.workoutTemplates.add(createEntity(
      createWorkoutTemplateInput({ name: 'Push A' }),
      'template-push',
    ));
    await database.workoutTemplateExercises.add(createEntity(
      createWorkoutTemplateExerciseInput({
        templateId: 'template-push',
        exerciseDefinitionId: 'exercise-bench',
      }),
      'template-exercise-bench',
    ));
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('planifie une séance avec un instantané du modèle puis la liste dans sa semaine', async () => {
    const planned = await planWorkoutSessionFromTemplate(
      sessionRepository,
      templateRepository,
      exerciseRepository,
      'template-push',
      '2026-06-29',
      new Date('2026-06-26T18:00:00.000Z'),
    );

    expect(planned.session).toMatchObject({
      date: '2026-06-29',
      plannedDate: '2026-06-29',
      originalPlannedDate: '2026-06-29',
      status: 'planned',
      sourceTemplateNameSnapshot: 'Push A',
    });
    expect(planned.exercises).toHaveLength(1);

    await database.workoutTemplates.update('template-push', { name: 'Nom modifié' });
    expect((await sessionRepository.getById(planned.session.id))?.sourceTemplateNameSnapshot).toBe('Push A');

    const days = await listWeeklyPlanning(sessionRepository, '2026-06-30');
    expect(days).toHaveLength(7);
    expect(days[0]?.date).toBe('2026-06-29');
    expect(days[0]?.sessions[0]?.session.id).toBe(planned.session.id);
  });

  it('reporte une séance en conservant sa date initiale', async () => {
    const planned = await planWorkoutSessionFromTemplate(
      sessionRepository,
      templateRepository,
      exerciseRepository,
      'template-push',
      '2026-06-29',
    );

    const rescheduled = await reschedulePlannedWorkoutSession(
      sessionRepository,
      planned.session.id,
      '2026-07-01',
    );

    expect(rescheduled).toMatchObject({
      date: '2026-07-01',
      plannedDate: '2026-07-01',
      originalPlannedDate: '2026-06-29',
      status: 'planned',
    });
  });

  it('transforme la séance prévue en séance réelle sans perdre le lien au planning', async () => {
    const planned = await planWorkoutSessionFromTemplate(
      sessionRepository,
      templateRepository,
      exerciseRepository,
      'template-push',
      '2026-06-29',
    );

    const started = await startPlannedWorkoutSession(
      sessionRepository,
      planned.session.id,
      new Date('2026-06-30T17:30:00.000Z'),
    );

    expect(started).toMatchObject({
      id: planned.session.id,
      status: 'inProgress',
      date: '2026-06-30',
      plannedDate: '2026-06-29',
      startedAt: '2026-06-30T17:30:00.000Z',
    });
    expect(planningDateForSession(started)).toBe('2026-06-29');
  });

  it('marque une séance prévue comme non réalisée', async () => {
    const planned = await planWorkoutSessionFromTemplate(
      sessionRepository,
      templateRepository,
      exerciseRepository,
      'template-push',
      '2026-06-29',
    );

    const skipped = await skipPlannedWorkoutSession(
      sessionRepository,
      planned.session.id,
      new Date('2026-06-29T20:00:00.000Z'),
    );

    expect(skipped).toMatchObject({
      status: 'skipped',
      skippedAt: '2026-06-29T20:00:00.000Z',
      plannedDate: '2026-06-29',
    });
  });

  it('calcule toujours le lundi comme début de semaine', () => {
    expect(getWeekStart('2026-07-02')).toBe('2026-06-29');
  });
});
