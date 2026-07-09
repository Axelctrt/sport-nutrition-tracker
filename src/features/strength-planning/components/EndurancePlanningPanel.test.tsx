import {
  cleanup,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { readEndurancePlanningState } from '@/domain/planning/endurancePlanningState';
import { savePlannedEnduranceSession } from '@/application/planning/endurancePlanningService';
import type { DailyTarget } from '@/domain/models/targets';
import { createEntity } from '@/shared/utils/entities';
import { EndurancePlanningPanel } from '@/features/strength-planning/components/EndurancePlanningPanel';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { ToastProvider } from '@/shared/toast/ToastProvider';
import { toLocalDate } from '@/shared/utils/dates';

describe('EndurancePlanningPanel', () => {
  beforeEach(async () => {
    cleanup();
    window.localStorage.clear();
    appDatabase.close();
    await appDatabase.delete();
    await initializeDatabase();
  });

  afterEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
    window.localStorage.clear();
  });

  it('confirme immédiatement la planification d’une activité', async () => {
    const user = userEvent.setup();
    const today = toLocalDate();

    render(
      <MemoryRouter>
        <ToastProvider>
          <EndurancePlanningPanel weekStart={today} />
        </ToastProvider>
      </MemoryRouter>,
    );

    const form = await screen.findByLabelText(
      'Planifier une activité d’endurance',
    );

    await user.type(
      within(form).getByLabelText('Nom facultatif'),
      'Footing facile',
    );

    await user.click(
      within(form).getByRole('button', {
        name: 'Planifier l’activité',
      }),
    );

    expect(
      await screen.findByText('Activité planifiée'),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Footing facile a été ajoutée au planning/,
      ),
    ).toBeInTheDocument();

    expect(
      readEndurancePlanningState().sessions,
    ).toEqual([
      expect.objectContaining({
        title: 'Footing facile',
        activityType: 'running',
        date: today,
        status: 'planned',
      }),
    ]);
  });
  it('affiche les calories prévues directement sur la carte d’endurance', async () => {
    const today = toLocalDate();
    const session = savePlannedEnduranceSession({
      title: 'Sortie longue',
      activityType: 'running',
      date: today,
      intensity: 'moderate',
      targetDurationMinutes: 60,
      targetDistanceKm: 10,
    });

    await appDatabase.dailyTargets.add(createEntity<DailyTarget>({
      date: today,
      calculationWeightKg: 70,
      energy: {
        bmrKcal: 1_600,
        occupationalBaseKcal: 1_920,
        walkingKcal: 0,
        runningKcal: 0,
        swimmingKcal: 0,
        strengthTrainingKcal: 0,
        otherActivitiesKcal: 0,
        plannedActivitiesKcal: 700,
        totalEstimatedExpenditureKcal: 2_620,
      },
      goalAdjustmentKcal: 0,
      acceptedCalibrationAdjustmentKcal: 0,
      calorieFloorKcal: 1_760,
      targetCaloriesKcal: 2_620,
      macros: {
        proteinGrams: 125,
        carbohydratesGrams: 350,
        fatGrams: 65,
      },
      plannedActivities: [{
        id: `endurancePlanning:${session.id}`,
        source: 'endurancePlanning',
        sourceId: session.id,
        title: session.title,
        date: today,
        activityType: 'running',
        estimatedCaloriesKcal: 700,
        weightKg: 70,
        calculationVersion: 1,
        basis: 'plannedDistance',
        durationMinutes: 60,
        coefficientUsed: 1,
      }],
      calculationVersion: 4,
    }, 'target-endurance'));

    render(
      <MemoryRouter>
        <ToastProvider>
          <EndurancePlanningPanel weekStart={today} />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/≈ 700 kcal prévues/)).toBeInTheDocument();
  });

});
