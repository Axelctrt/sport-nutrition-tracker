import type {
  Activity,
} from '@/domain/models/activity';
import type {
  PlannedEnduranceSession,
} from '@/domain/planning/endurancePlanningState';
import {
  buildTrainingAgenda,
} from '@/application/planning/trainingAgendaService';

const enduranceSessions: PlannedEnduranceSession[] = [
  {
    id: 'run-overdue',
    title: 'Footing oublié',
    activityType: 'running',
    date: '2026-06-27',
    intensity: 'low',
    targetDurationMinutes: 40,
    status: 'planned',
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  {
    id: 'swim-done',
    title: 'Natation',
    activityType: 'swimming',
    date: '2026-06-28',
    intensity: 'moderate',
    targetDistanceMeters: 1500,
    status: 'planned',
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  {
    id: 'bike-upcoming',
    title: 'Sortie vélo',
    activityType: 'cycling',
    date: '2026-07-01',
    intensity: 'moderate',
    targetDistanceKm: 35,
    status: 'planned',
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
];

const completedSwim: Activity = {
  id: 'activity-swim',
  type: 'swimming',
  date: '2026-06-28',
  durationMinutes: 45,
  intensity: 'moderate',
  sessionType: 'endurance',
  mainStroke: 'freestyle',
  distanceMeters: 1500,
  poolLengthMeters: 25,
  calculation: {
    weightKg: 70,
    estimatedCaloriesKcal: 300,
    calculationVersion: 1,
  },
  createdAt: '2026-06-28T11:00:00.000Z',
  updatedAt: '2026-06-28T11:00:00.000Z',
};

describe('trainingAgendaService', () => {
  it('réunit les séances utiles et masque l’endurance déjà réalisée', () => {
    const agenda = buildTrainingAgenda(
      [
        {
          id: 'strength-active',
          title: 'Push',
          date: '2026-06-26',
          status: 'inProgress',
        },
        {
          id: 'strength-today',
          title: 'Jambes',
          date: '2026-06-28',
          status: 'planned',
        },
        {
          id: 'strength-later',
          title: 'Dos',
          date: '2026-07-10',
          status: 'planned',
        },
      ],
      enduranceSessions,
      [completedSwim],
      '2026-06-28',
    );

    expect(agenda.entries).toEqual([
      expect.objectContaining({
        id: 'strength-active',
        status: 'inProgress',
      }),
      expect.objectContaining({
        id: 'run-overdue',
        status: 'overdue',
      }),
      expect.objectContaining({
        id: 'strength-today',
        status: 'today',
      }),
      expect.objectContaining({
        id: 'bike-upcoming',
        status: 'upcoming',
      }),
    ]);

    expect(
      agenda.entries.some(
        ({ id }) => id === 'swim-done',
      ),
    ).toBe(false);
    expect(agenda.overdueCount).toBe(1);
    expect(agenda.todayCount).toBe(2);
    expect(agenda.upcomingCount).toBe(1);
  });

  it('ne réutilise pas une activité réelle pour deux séances prévues', () => {
    const duplicate = {
      ...enduranceSessions[1]!,
      id: 'swim-second',
      title: 'Deuxième natation',
    };

    const agenda = buildTrainingAgenda(
      [],
      [
        enduranceSessions[1]!,
        duplicate,
      ],
      [completedSwim],
      '2026-06-28',
    );

    expect(agenda.entries).toHaveLength(1);
    expect(agenda.entries[0]?.id).toBe(
      'swim-second',
    );
  });
});
