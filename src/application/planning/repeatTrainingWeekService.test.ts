import {
  buildRepeatTrainingWeekPlan,
} from '@/application/planning/repeatTrainingWeekService';
import type {
  EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';

const enduranceState: EndurancePlanningState = {
  version: 1,
  sessions: [
    {
      id: 'run-source',
      title: 'Footing facile',
      activityType: 'running',
      date: '2026-06-29',
      intensity: 'low',
      targetDurationMinutes: 45,
      status: 'planned',
      createdAt: '2026-06-28T10:00:00.000Z',
      updatedAt: '2026-06-28T10:00:00.000Z',
    },
    {
      id: 'swim-source',
      title: 'Natation',
      activityType: 'swimming',
      date: '2026-07-01',
      intensity: 'moderate',
      targetDistanceMeters: 1500,
      status: 'skipped',
      skippedAt: '2026-07-01T20:00:00.000Z',
      createdAt: '2026-06-28T10:00:00.000Z',
      updatedAt: '2026-07-01T20:00:00.000Z',
    },
    {
      id: 'run-target',
      title: 'Footing facile',
      activityType: 'running',
      date: '2026-07-06',
      intensity: 'low',
      status: 'planned',
      createdAt: '2026-07-05T10:00:00.000Z',
      updatedAt: '2026-07-05T10:00:00.000Z',
    },
  ],
};

describe('repeatTrainingWeekService', () => {
  it('transpose les jours et ignore les doublons déjà présents', () => {
    const plan = buildRepeatTrainingWeekPlan(
      [
        {
          templateId: 'template-push',
          plannedDate: '2026-06-30',
        },
        {
          templateId: 'template-legs',
          plannedDate: '2026-07-02',
        },
      ],
      [
        {
          templateId: 'template-push',
          plannedDate: '2026-07-07',
        },
      ],
      enduranceState,
      '2026-06-29',
      '2026-07-06',
      new Date('2026-07-05T12:00:00.000Z'),
    );

    expect(plan.strengthToCreate).toEqual([
      {
        templateId: 'template-legs',
        plannedDate: '2026-07-09',
      },
    ]);
    expect(plan.ignoredStrengthCount).toBe(1);
    expect(plan.ignoredEnduranceCount).toBe(1);

    expect(plan.enduranceToCreate).toEqual([
      expect.objectContaining({
        title: 'Natation',
        date: '2026-07-08',
        status: 'planned',
        createdAt: '2026-07-05T12:00:00.000Z',
        updatedAt: '2026-07-05T12:00:00.000Z',
      }),
    ]);
    expect(
      plan.enduranceToCreate[0],
    ).not.toHaveProperty('skippedAt');
  });

  it('refuse de copier une semaine sur elle-même', () => {
    expect(() =>
      buildRepeatTrainingWeekPlan(
        [],
        [],
        {
          version: 1,
          sessions: [],
        },
        '2026-06-29',
        '2026-07-01',
      ),
    ).toThrow(
      'Choisis une semaine cible différente.',
    );
  });
});
