import { describe, expect, it } from 'vitest';
import { buildExerciseGroups, groupRestAfterExercise } from '@/domain/strength/exerciseGroups';
import type { WorkoutSessionExercise } from '@/domain/models/strength';
import { createEntity } from '@/shared/utils/entities';
import { createWorkoutSessionExerciseInput } from '@/test/factories/strengthFactory';

function groupedExercise(id: string, sortOrder: number): WorkoutSessionExercise {
  return createEntity(createWorkoutSessionExerciseInput({
    sortOrder,
    exerciseGroupId: 'group-a',
    exerciseGroupType: 'superset',
    exerciseGroupName: 'Dos / pecs',
    exerciseGroupRounds: 4,
    exerciseGroupRestBetweenExercisesSeconds: 15,
    exerciseGroupRestBetweenRoundsSeconds: 90,
  }), id);
}

describe('exerciseGroups', () => {
  it('reconstruit un groupe ordonné et ses réglages', () => {
    const second = groupedExercise('second', 1);
    const first = groupedExercise('first', 0);
    const groups = buildExerciseGroups([second, first]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: 'group-a',
      type: 'superset',
      label: 'Dos / pecs',
      rounds: 4,
      restBetweenExercisesSeconds: 15,
      restBetweenRoundsSeconds: 90,
      exercises: [first, second],
    });
  });

  it('distingue le repos entre exercices du repos entre tours', () => {
    const first = groupedExercise('first', 0);
    const second = groupedExercise('second', 1);
    const groups = buildExerciseGroups([first, second]);

    expect(groupRestAfterExercise(first, groups)).toMatchObject({
      durationSeconds: 15,
      nextExercise: second,
      betweenRounds: false,
    });
    expect(groupRestAfterExercise(second, groups)).toMatchObject({
      durationSeconds: 90,
      nextExercise: first,
      betweenRounds: true,
    });
  });
});
