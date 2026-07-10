import type { TrainingAgendaSnapshot } from '@/application/planning/trainingAgendaService';
import {
  buildSportHubSnapshot,
  orderActivityTypesByFrequency,
} from '@/application/sport/sportHubService';
import type { Activity } from '@/domain/models/activity';

function activity(
  id: string,
  type: Activity['type'],
  date: string,
  durationMinutes = 30,
): Activity {
  const base = {
    id,
    date,
    durationMinutes,
    intensity: 'moderate' as const,
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: durationMinutes * 5,
      calculationVersion: 1,
    },
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };

  if (type === 'running') {
    return {
      ...base,
      type,
      sessionType: 'easy',
      distanceKm: 5,
      averageCadenceSpm: 170,
    };
  }
  if (type === 'swimming') {
    return {
      ...base,
      type,
      sessionType: 'endurance',
      mainStroke: 'freestyle',
      distanceMeters: 1_000,
    };
  }
  if (type === 'cycling') {
    return {
      ...base,
      type,
      met: 6,
      includedInDailySteps: false,
      distanceKm: 20,
    };
  }
  if (type === 'strengthTraining') {
    return { ...base, type, met: 5 };
  }
  return {
    ...base,
    type,
    met: 4,
    includedInDailySteps: true,
  };
}

const agenda: TrainingAgendaSnapshot = {
  today: '2026-07-10',
  endDate: '2026-07-17',
  entries: [
    {
      id: 'active-strength',
      source: 'strength',
      title: 'Haut du corps',
      date: '2026-07-10',
      status: 'inProgress',
    },
    {
      id: 'run-today',
      source: 'endurance',
      title: 'Footing',
      date: '2026-07-10',
      status: 'today',
      activityType: 'running',
      targetDurationMinutes: 45,
    },
    {
      id: 'swim-upcoming',
      source: 'endurance',
      title: 'Natation',
      date: '2026-07-12',
      status: 'upcoming',
      activityType: 'swimming',
    },
  ],
  overdueCount: 0,
  todayCount: 2,
  upcomingCount: 1,
};

describe('sportHubService', () => {
  it('résume la séance active, le programme, le dernier entraînement et la semaine', () => {
    const snapshot = buildSportHubSnapshot([
      activity('run', 'running', '2026-07-08', 40),
      activity('swim', 'swimming', '2026-07-09', 50),
      activity('bike', 'cycling', '2026-07-10', 60),
    ], agenda, '2026-07-10');

    expect(snapshot.currentSession).toMatchObject({ id: 'active-strength' });
    expect(snapshot.plannedEntries.map(({ id }) => id)).toEqual([
      'run-today',
      'swim-upcoming',
    ]);
    expect(snapshot.latestActivity).toMatchObject({ id: 'bike' });
    expect(snapshot.week).toMatchObject({
      startDate: '2026-07-06',
      endDate: '2026-07-12',
      activityCount: 3,
      totalDurationMinutes: 150,
      distanceKm: 25,
      swimmingDistanceMeters: 1_000,
    });
  });

  it('classe les types fréquents avant les valeurs par défaut', () => {
    expect(orderActivityTypesByFrequency([
      activity('walk-1', 'walking', '2026-07-01'),
      activity('walk-2', 'walking', '2026-07-02'),
      activity('swim', 'swimming', '2026-07-03'),
    ])).toEqual([
      'walking',
      'swimming',
      'running',
      'strengthTraining',
      'cycling',
      'otherCardio',
    ]);
  });

  it('retourne un état vide exploitable', () => {
    const snapshot = buildSportHubSnapshot([], {
      ...agenda,
      entries: [],
      todayCount: 0,
      upcomingCount: 0,
    }, '2026-07-10');

    expect(snapshot.latestActivity).toBeUndefined();
    expect(snapshot.currentSession).toBeUndefined();
    expect(snapshot.plannedEntries).toEqual([]);
    expect(snapshot.week.activityCount).toBe(0);
  });
});
