import { describe, expect, it } from 'vitest';
import {
  buildWorkoutExerciseProgress,
  buildWorkoutSessionProgress,
} from '@/application/strength/workoutSessionProgress';
import type { StrengthSet, WorkoutSessionExercise } from '@/domain/models/strength';
import { createEntity } from '@/shared/utils/entities';
import {
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
} from '@/test/factories/strengthFactory';

function exercise(
  id: string,
  overrides: Partial<WorkoutSessionExercise> = {},
): WorkoutSessionExercise {
  const result = createEntity(createWorkoutSessionExerciseInput({
    sessionId: 'session-1',
    exerciseDefinitionId: `definition-${id}`,
    exerciseNameSnapshot: id === 'bench' ? 'Développé couché' : id === 'row' ? 'Rowing barre' : 'Presse à cuisses',
    ...overrides,
  }), id);
  if (!Object.prototype.hasOwnProperty.call(overrides, 'plannedSets')) {
    delete result.plannedSets;
  }
  return result;
}

function strengthSet(
  id: string,
  sessionExerciseId: string,
  setNumber: number,
  overrides: Partial<StrengthSet> = {},
): StrengthSet {
  return createEntity(createStrengthSetInput({
    sessionId: 'session-1',
    sessionExerciseId,
    setNumber,
    ...overrides,
  }), id);
}

describe('buildWorkoutSessionProgress', () => {
  it('calcule les séries présentes et pointe vers la prochaine série incomplète', () => {
    const exercises = [
      exercise('bench', { plannedSets: 3, sortOrder: 0 }),
      exercise('row', { plannedSets: 2, sortOrder: 1 }),
    ];
    const sets = [
      strengthSet('bench-warmup', 'bench', 1, { type: 'warmup', isCompleted: true }),
      strengthSet('bench-1', 'bench', 2, { isCompleted: true }),
      strengthSet('bench-2', 'bench', 3, { isCompleted: false }),
      strengthSet('bench-3', 'bench', 4, { isCompleted: false }),
      strengthSet('row-1', 'row', 1, { isCompleted: false }),
      strengthSet('row-2', 'row', 2, { isCompleted: false }),
    ];

    expect(buildWorkoutSessionProgress(exercises, sets)).toEqual({
      completedExerciseCount: 0,
      exerciseCount: 2,
      completedSetCount: 1,
      totalSetCount: 5,
      remainingSetCount: 4,
      incompleteExerciseCount: 2,
      percentage: 20,
      isComplete: false,
      nextStep: {
        exerciseId: 'bench',
        exerciseName: 'Développé couché',
        setId: 'bench-2',
        setNumber: 3,
      },
    });
  });

  it('réduit immédiatement la cible lorsqu’une série planifiée est supprimée', () => {
    const bench = exercise('bench', { plannedSets: 3 });
    const progress = buildWorkoutSessionProgress(
      [bench],
      [
        strengthSet('bench-1', 'bench', 1, { isCompleted: true }),
        strengthSet('bench-2', 'bench', 2, { isCompleted: true }),
      ],
    );

    expect(buildWorkoutExerciseProgress(bench, [
      strengthSet('bench-1-copy', 'bench', 1, { isCompleted: true }),
      strengthSet('bench-2-copy', 'bench', 2, { isCompleted: true }),
    ])).toMatchObject({
      completedSetCount: 2,
      totalSetCount: 2,
      isComplete: true,
    });
    expect(progress).toMatchObject({
      completedExerciseCount: 1,
      completedSetCount: 2,
      totalSetCount: 2,
      remainingSetCount: 0,
      percentage: 100,
      isComplete: true,
    });
    expect(progress.nextStep).toBeUndefined();
  });

  it('guide les groupes en alternant les exercices à chaque tour', () => {
    const groupMetadata = {
      exerciseGroupId: 'group-a',
      exerciseGroupType: 'superset' as const,
      exerciseGroupRounds: 2,
    };
    const exercises = [
      exercise('bench', { ...groupMetadata, plannedSets: 2, sortOrder: 0 }),
      exercise('row', { ...groupMetadata, plannedSets: 2, sortOrder: 1 }),
      exercise('legs', { plannedSets: 1, sortOrder: 2 }),
    ];
    const sets = [
      strengthSet('bench-1', 'bench', 1, { isCompleted: true }),
      strengthSet('bench-2', 'bench', 2, { isCompleted: false }),
      strengthSet('row-1', 'row', 1, { isCompleted: false }),
      strengthSet('row-2', 'row', 2, { isCompleted: false }),
      strengthSet('legs-1', 'legs', 1, { isCompleted: false }),
    ];

    expect(buildWorkoutSessionProgress(exercises, sets).nextStep).toEqual({
      exerciseId: 'row',
      exerciseName: 'Rowing barre',
      setId: 'row-1',
      setNumber: 1,
    });

    sets[2] = { ...sets[2]!, isCompleted: true };
    expect(buildWorkoutSessionProgress(exercises, sets).nextStep).toEqual({
      exerciseId: 'bench',
      exerciseName: 'Développé couché',
      setId: 'bench-2',
      setNumber: 2,
    });

    sets[1] = { ...sets[1]!, isCompleted: true };
    sets[3] = { ...sets[3]!, isCompleted: true };
    expect(buildWorkoutSessionProgress(exercises, sets).nextStep).toEqual({
      exerciseId: 'legs',
      exerciseName: 'Presse à cuisses',
      setId: 'legs-1',
      setNumber: 1,
    });
  });

  it.each(['superset', 'triSet', 'circuit'] as const)(
    'attend la fin de tout le bloc %s avant de passer à l’exercice suivant',
    (groupType) => {
      const memberIds = groupType === 'superset' ? ['bench', 'row'] : ['bench', 'row', 'legs'];
      const groupedExercises = memberIds.map((id, index) => exercise(id, {
        exerciseGroupId: 'group-a',
        exerciseGroupType: groupType,
        exerciseGroupRounds: 1,
        plannedSets: 1,
        sortOrder: index,
      }));
      const nextExercise = exercise('next', { plannedSets: 1, sortOrder: memberIds.length });
      const groupedSets = memberIds.map((id, index) => strengthSet(`${id}-1`, id, 1, {
        isCompleted: index < memberIds.length - 1,
      }));
      const nextSet = strengthSet('next-1', 'next', 1, { isCompleted: false });

      expect(buildWorkoutSessionProgress(
        [...groupedExercises, nextExercise],
        [...groupedSets, nextSet],
      ).nextStep?.exerciseId).toBe(memberIds.at(-1));

      groupedSets[groupedSets.length - 1] = {
        ...groupedSets[groupedSets.length - 1]!,
        isCompleted: true,
      };

      expect(buildWorkoutSessionProgress(
        [...groupedExercises, nextExercise],
        [...groupedSets, nextSet],
      ).nextStep?.exerciseId).toBe('next');
    },
  );

  it('considère une séance terminée lorsque toutes les séries suivies sont validées', () => {
    const progress = buildWorkoutSessionProgress(
      [exercise('bench'), exercise('row')],
      [
        strengthSet('bench-1', 'bench', 1, { isCompleted: true }),
        strengthSet('row-1', 'row', 1, { isCompleted: true }),
      ],
    );

    expect(progress).toMatchObject({
      completedExerciseCount: 2,
      exerciseCount: 2,
      completedSetCount: 2,
      totalSetCount: 2,
      remainingSetCount: 0,
      incompleteExerciseCount: 0,
      percentage: 100,
      isComplete: true,
    });
    expect(progress.nextStep).toBeUndefined();
  });
});
