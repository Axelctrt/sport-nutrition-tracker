import {
  projectCompletedStrengthSessionToSocialSnapshotV2,
  projectStoredActivityToSocialSnapshotV2,
} from '@/application/friends/socialActivityProjectionService';
import {
  applyFriendScopeToSocialActivitySharingPolicy,
  resolveSocialActivitySharingPolicy,
  type RecipientScopedSocialActivitySharingPolicy,
  type SocialActivityFieldSelection,
  type SocialActivityVisibility,
} from '@/domain/friends/socialActivitySharingPolicy';
import type { CyclingActivity, StrengthTrainingActivity, SwimmingActivity } from '@/domain/models/activity';
import type {
  ExerciseDefinition,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import { createEntity } from '@/shared/utils/entities';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import {
  createExerciseDefinitionInput,
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';

function recipientPolicy(
  visibility: SocialActivityVisibility,
  fields: SocialActivityFieldSelection,
  scope: 'none' | 'summary' | 'detailed' = 'detailed',
): RecipientScopedSocialActivitySharingPolicy {
  const ownerPolicy = resolveSocialActivitySharingPolicy(
    { visibility, fields },
    visibility === 'custom' ? { mode: 'custom', fields } : { mode: visibility },
  );
  return applyFriendScopeToSocialActivitySharingPolicy(ownerPolicy, scope);
}

const fullCardioFields: SocialActivityFieldSelection = {
  common: ['activityType', 'title', 'date', 'time', 'duration', 'intensity', 'calories'],
  cardio: [
    'distance',
    'sessionType',
    'terrain',
    'stroke',
    'poolLength',
    'bikeType',
    'environment',
    'pace',
    'speed',
    'elevation',
    'cadence',
    'intervals',
    'chart',
  ],
  strength: [],
};

const strengthFieldsWithoutLoads: SocialActivityFieldSelection = {
  common: ['activityType', 'title', 'date', 'time', 'duration'],
  cardio: [],
  strength: [
    'sessionName',
    'muscleGroups',
    'exerciseCount',
    'exercises',
    'sets',
    'repetitions',
    'rpe',
  ],
};

function completedStrengthFixture(): {
  session: WorkoutSession;
  exercises: WorkoutSessionExercise[];
  sets: StrengthSet[];
  definitions: ExerciseDefinition[];
} {
  const session = {
    ...createEntity<WorkoutSession>(
      createWorkoutSessionInput({
        sourceTemplateNameSnapshot: 'Push complet',
        notes: 'Note privée de séance',
      }),
      'session-push',
      '2026-07-07T16:00:00.000Z',
    ),
    updatedAt: '2026-07-07T18:00:00.000Z',
  };
  const bench = {
    ...createEntity<WorkoutSessionExercise>(
      createWorkoutSessionExerciseInput({
        sessionId: session.id,
        exerciseDefinitionId: 'definition-bench',
        exerciseNameSnapshot: 'Développé couché',
        sortOrder: 0,
        notes: 'Note privée exercice',
        loadUnitSnapshot: 'kg',
        trackingModeSnapshot: 'loadRepetitions',
      }),
      'session-exercise-bench',
      '2026-07-07T16:05:00.000Z',
    ),
    updatedAt: '2026-07-07T18:01:00.000Z',
  };
  const pullups = createEntity<WorkoutSessionExercise>(
    createWorkoutSessionExerciseInput({
      sessionId: session.id,
      exerciseDefinitionId: 'definition-pullups',
      exerciseNameSnapshot: 'Tractions',
      sortOrder: 1,
      loadUnitSnapshot: 'bodyweight',
      trackingModeSnapshot: 'bodyweightRepetitions',
    }),
    'session-exercise-pullups',
    '2026-07-07T16:06:00.000Z',
  );
  const unrelatedExercise = createEntity<WorkoutSessionExercise>(
    createWorkoutSessionExerciseInput({ sessionId: 'other-session' }),
    'unrelated-exercise',
    '2026-07-07T16:00:00.000Z',
  );
  const firstSet = createEntity<StrengthSet>(
    createStrengthSetInput({
      sessionId: session.id,
      sessionExerciseId: bench.id,
      setNumber: 1,
      repetitions: 10,
      weightKg: 60,
      rpe: 8,
      notes: 'Note privée série',
    }),
    'set-bench-1',
    '2026-07-07T17:00:00.000Z',
  );
  const secondSet = {
    ...createEntity<StrengthSet>(
      createStrengthSetInput({
        sessionId: session.id,
        sessionExerciseId: bench.id,
        setNumber: 2,
        repetitions: 8,
        weightKg: 65,
        rpe: 9,
      }),
      'set-bench-2',
      '2026-07-07T17:05:00.000Z',
    ),
    updatedAt: '2026-07-07T18:03:00.000Z',
  };
  const incompleteSet = createEntity<StrengthSet>({
    sessionId: session.id,
    sessionExerciseId: bench.id,
    setNumber: 3,
    repetitions: 7,
    weightKg: 65,
    type: 'working',
    isCompleted: false,
  }, 'set-bench-incomplete', '2026-07-07T17:10:00.000Z');
  const bodyweightSet = createEntity<StrengthSet>(
    createStrengthSetInput({
      sessionId: session.id,
      sessionExerciseId: pullups.id,
      setNumber: 1,
      repetitions: 9,
      weightKg: 0,
      rpe: 8,
    }),
    'set-pullups-1',
    '2026-07-07T17:15:00.000Z',
  );
  const unrelatedSet = createEntity<StrengthSet>(
    createStrengthSetInput({ sessionId: 'other-session', sessionExerciseId: unrelatedExercise.id }),
    'unrelated-set',
    '2026-07-07T17:00:00.000Z',
  );

  return {
    session,
    exercises: [pullups, unrelatedExercise, bench],
    sets: [bodyweightSet, unrelatedSet, incompleteSet, secondSet, firstSet],
    definitions: [
      createEntity<ExerciseDefinition>(
        createExerciseDefinitionInput({
          primaryMuscleGroup: 'pectorals',
          secondaryMuscleGroups: ['triceps'],
        }),
        'definition-bench',
        '2026-07-07T18:04:00.000Z',
      ),
      createEntity<ExerciseDefinition>(
        createExerciseDefinitionInput({
          name: 'Tractions',
          primaryMuscleGroup: 'back',
          secondaryMuscleGroups: ['biceps'],
          loadUnit: 'bodyweight',
          trackingMode: 'bodyweightRepetitions',
        }),
        'definition-pullups',
        '2026-07-01T10:00:00.000Z',
      ),
    ],
  };
}

describe('social activity projection service', () => {
  it('projette uniquement les métriques cardio réellement persistées et autorisées', () => {
    const activity = {
      ...createEntity(
        createRunningActivityInput({
          date: '2026-07-07',
          time: '07:15',
          durationMinutes: 48,
          intensity: 'high',
          distanceKm: 8.4,
          averageCadenceSpm: 176,
          elevationGainMeters: 120,
          terrainType: 'trail',
          sessionType: 'tempo',
          intervalDetails: 'Consigne privée non structurée',
          notes: 'Douleur privée',
          manualCaloriesKcal: 510,
        }),
        'activity-run',
        '2026-07-07T08:30:00.000Z',
      ),
      updatedAt: '2026-07-07T09:00:00.000Z',
    };
    const snapshot = projectStoredActivityToSocialSnapshotV2({
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      activity,
      title: 'Sortie tempo',
      policy: recipientPolicy('custom', fullCardioFields),
    });

    expect(snapshot).toMatchObject({
      sourceKind: 'activity',
      sourceRevision: '2026-07-07T09:00:00.000Z',
      title: 'Sortie tempo',
      occurredOn: '2026-07-07',
      occurredTime: '07:15',
      summary: {
        durationMinutes: 48,
        intensity: 'high',
        caloriesKcal: 510,
        distanceKm: 8.4,
        elevationGainMeters: 120,
        averageCadencePerMinute: 176,
      },
      detail: {
        family: 'cardio',
        sessionType: 'tempo',
        terrainType: 'trail',
      },
    });
    expect(snapshot?.summary.paceMinutesPerKm).toBeCloseTo(48 / 8.4, 6);
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('notes');
    expect(serialized).not.toContain('manualCaloriesKcal');
    expect(serialized).not.toContain('calculation');
    expect(serialized).not.toContain('intervalDetails');
    expect(snapshot?.detail).not.toHaveProperty('chart');
  });

  it('applique la limitation résumé du destinataire avant toute projection', () => {
    const activity = createEntity(
      createRunningActivityInput({ manualCaloriesKcal: 600, notes: 'Privé' }),
      'activity-summary',
      '2026-07-07T10:00:00.000Z',
    );
    const snapshot = projectStoredActivityToSocialSnapshotV2({
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      activity,
      title: 'Résumé',
      policy: recipientPolicy('custom', fullCardioFields, 'summary'),
    });

    expect(snapshot).toMatchObject({
      visibility: 'summary',
      allowedFields: {
        common: ['activityType', 'title', 'date', 'duration'],
        cardio: ['distance'],
        strength: [],
      },
      summary: { durationMinutes: 50, distanceKm: 8 },
    });
    expect(snapshot).not.toHaveProperty('detail');
    expect(snapshot?.summary).not.toHaveProperty('caloriesKcal');
    expect(snapshot?.summary).not.toHaveProperty('paceMinutesPerKm');
    expect(snapshot).not.toHaveProperty('occurredTime');
  });

  it('calcule le rythme de natation dans son unité réelle sans fabriquer de série', () => {
    const activity = createEntity<SwimmingActivity>({
      type: 'swimming',
      date: '2026-07-07',
      time: '12:30',
      durationMinutes: 30,
      intensity: 'moderate',
      sessionType: 'endurance',
      mainStroke: 'freestyle',
      distanceMeters: 1_500,
      poolLengthMeters: 25,
      intervalDetails: '10 x 100 m',
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 300,
        calculationVersion: 1,
      },
    }, 'activity-swim', '2026-07-07T13:15:00.000Z');
    const snapshot = projectStoredActivityToSocialSnapshotV2({
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      activity,
      policy: recipientPolicy('custom', fullCardioFields),
    });

    expect(snapshot?.summary).toMatchObject({
      distanceMeters: 1_500,
      paceSecondsPer100Meters: 120,
    });
    expect(snapshot?.detail).toEqual({
      family: 'cardio',
      sessionType: 'endurance',
      mainStroke: 'freestyle',
      poolLengthMeters: 25,
    });
    expect(snapshot?.detail).not.toHaveProperty('intervals');
    expect(snapshot?.detail).not.toHaveProperty('chart');
  });

  it('réutilise le calcul de vitesse existant pour le vélo', () => {
    const activity = createEntity<CyclingActivity>({
      type: 'cycling',
      date: '2026-07-07',
      durationMinutes: 90,
      intensity: 'moderate',
      met: 8,
      includedInDailySteps: false,
      distanceKm: 45,
      elevationGainMeters: 450,
      bikeType: 'road',
      environment: 'outdoor',
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 720,
        calculationVersion: 1,
      },
    }, 'activity-bike', '2026-07-07T16:00:00.000Z');
    const snapshot = projectStoredActivityToSocialSnapshotV2({
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      activity,
      policy: recipientPolicy('custom', fullCardioFields),
    });

    expect(snapshot?.summary).toMatchObject({
      distanceKm: 45,
      speedKph: 30,
      elevationGainMeters: 450,
    });
    expect(snapshot?.detail).toEqual({
      family: 'cardio',
      bikeType: 'road',
      environment: 'outdoor',
    });
  });

  it('ne publie rien lorsque la politique effective est privée', () => {
    const activity = createEntity(createRunningActivityInput(), 'activity-private');
    const snapshot = projectStoredActivityToSocialSnapshotV2({
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      activity,
      policy: recipientPolicy('private', fullCardioFields),
    });

    expect(snapshot).toBeUndefined();
  });

  it('refuse la projection musculation depuis une activité générique', () => {
    const activity = createEntity<StrengthTrainingActivity>({
      type: 'strengthTraining',
      date: '2026-07-07',
      durationMinutes: 60,
      intensity: 'high',
      met: 6,
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 360,
        calculationVersion: 1,
      },
    }, 'activity-strength');

    expect(() => projectStoredActivityToSocialSnapshotV2({
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      activity,
      policy: recipientPolicy('custom', {
        common: ['activityType', 'date'],
        cardio: [],
        strength: ['exercises'],
      }),
    })).toThrow('utilise la séance de musculation terminée');
  });

  it('projette une séance terminée sans charges et sans données privées', () => {
    const fixture = completedStrengthFixture();
    const snapshot = projectCompletedStrengthSessionToSocialSnapshotV2({
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      policy: recipientPolicy('custom', strengthFieldsWithoutLoads),
      session: fixture.session,
      exercises: fixture.exercises,
      sets: fixture.sets,
      exerciseDefinitions: fixture.definitions,
    });

    expect(snapshot).toMatchObject({
      sourceKind: 'strengthSession',
      sourceRevision: '2026-07-07T18:04:00.000Z',
      title: 'Push complet',
      occurredAt: '2026-06-25T17:00:00.000Z',
      summary: {
        durationMinutes: 60,
        exerciseCount: 2,
        muscleGroups: ['pectorals', 'triceps', 'back', 'biceps'],
      },
      detail: {
        family: 'strength',
        sessionName: 'Push complet',
        exercises: [
          {
            name: 'Développé couché',
            muscleGroups: ['pectorals', 'triceps'],
            sets: [
              { setNumber: 1, repetitions: 10, rpe: 8 },
              { setNumber: 2, repetitions: 8, rpe: 9 },
            ],
          },
          {
            name: 'Tractions',
            muscleGroups: ['back', 'biceps'],
            sets: [{ setNumber: 1, repetitions: 9, rpe: 8 }],
          },
        ],
      },
    });
    expect(snapshot?.summary).not.toHaveProperty('volumeKg');
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('loadKg');
    expect(serialized).not.toContain('loadUnit');
    expect(serialized).not.toContain('notes');
    expect(serialized).not.toContain('set-bench-incomplete');
    expect(serialized).not.toContain('unrelated');
  });

  it('ajoute les charges, le poids du corps et le volume uniquement si autorisés', () => {
    const fixture = completedStrengthFixture();
    const snapshot = projectCompletedStrengthSessionToSocialSnapshotV2({
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      policy: recipientPolicy('custom', {
        common: ['activityType', 'date', 'duration'],
        cardio: [],
        strength: [
          'exerciseCount',
          'exercises',
          'sets',
          'repetitions',
          'loads',
          'bodyweight',
          'volume',
        ],
      }),
      session: fixture.session,
      exercises: fixture.exercises,
      sets: fixture.sets,
      exerciseDefinitions: fixture.definitions,
    });

    expect(snapshot?.summary.volumeKg).toBe(1_120);
    if (snapshot?.detail?.family !== 'strength') throw new Error('Détail musculation attendu.');
    expect(snapshot.detail.exercises?.[0]?.sets).toEqual([
      expect.objectContaining({ setNumber: 1, repetitions: 10, loadKg: 60, loadUnit: 'kg' }),
      expect.objectContaining({ setNumber: 2, repetitions: 8, loadKg: 65, loadUnit: 'kg' }),
    ]);
    expect(snapshot.detail.exercises?.[1]?.sets?.[0]).toEqual(
      expect.objectContaining({ setNumber: 1, repetitions: 9, loadUnit: 'bodyweight' }),
    );
    expect(snapshot.detail.exercises?.[1]?.sets?.[0]).not.toHaveProperty('loadKg');
  });

  it('ne publie pas une séance en cours, abandonnée ou planifiée', () => {
    const fixture = completedStrengthFixture();

    for (const status of ['planned', 'inProgress', 'abandoned'] as const) {
      const snapshot = projectCompletedStrengthSessionToSocialSnapshotV2({
        ownerUserId: 'owner',
        recipientUserId: 'friend',
        policy: recipientPolicy('custom', strengthFieldsWithoutLoads),
        session: { ...fixture.session, status },
        exercises: fixture.exercises,
        sets: fixture.sets,
        exerciseDefinitions: fixture.definitions,
      });
      expect(snapshot).toBeUndefined();
    }
  });

  it('produit un résumé musculation sans détail pour un ami limité', () => {
    const fixture = completedStrengthFixture();
    const snapshot = projectCompletedStrengthSessionToSocialSnapshotV2({
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      policy: recipientPolicy('custom', strengthFieldsWithoutLoads, 'summary'),
      session: fixture.session,
      exercises: fixture.exercises,
      sets: fixture.sets,
      exerciseDefinitions: fixture.definitions,
    });

    expect(snapshot).toMatchObject({
      visibility: 'summary',
      summary: {
        durationMinutes: 60,
        exerciseCount: 2,
        muscleGroups: ['pectorals', 'triceps', 'back', 'biceps'],
      },
    });
    expect(snapshot).not.toHaveProperty('detail');
  });
});
