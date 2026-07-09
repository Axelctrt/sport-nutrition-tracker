import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PlannedActivityCalorieSnapshot } from '@/domain/models/plannedActivity';
import type { WorkoutSession } from '@/domain/models/strength';
import { WeeklyPlanningSessionCard } from '@/features/strength-planning/components/WeeklyPlanningSessionCard';
import { createEntity } from '@/shared/utils/entities';

afterEach(cleanup);

describe('WeeklyPlanningSessionCard', () => {
  it('affiche directement la projection calorique de la séance planifiée', () => {
    const session = createEntity<WorkoutSession>({
      date: '2026-07-13',
      plannedDate: '2026-07-13',
      status: 'planned' as const,
      plannedDurationMinutes: 60,
      strengthSessionStyle: 'classic' as const,
      sourceTemplateNameSnapshot: 'Push A',
    }, 'session-planned');
    const calorieProjection: PlannedActivityCalorieSnapshot = {
      id: 'strengthSession:session-planned',
      source: 'strengthSession',
      sourceId: 'session-planned',
      title: 'Push A',
      date: '2026-07-13',
      activityType: 'strengthTraining',
      estimatedCaloriesKcal: 183.75,
      weightKg: 70,
      calculationVersion: 1,
      basis: 'plannedDuration',
      durationMinutes: 60,
      metUsed: 3.5,
    };

    render(
      <MemoryRouter>
        <WeeklyPlanningSessionCard
          summary={{ session, exerciseCount: 5 }}
          calorieProjection={calorieProjection}
          busy={false}
          onStart={() => undefined}
          onReschedule={async () => true}
          onSkip={async () => true}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/60 min prévues/)).toBeInTheDocument();
    expect(screen.getByText(/184 kcal estimées/)).toBeInTheDocument();
  });
});
