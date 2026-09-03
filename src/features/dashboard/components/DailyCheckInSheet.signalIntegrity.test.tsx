import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyCheckInSheet } from '@/features/dashboard/components/DailyCheckInSheet';
import type { DailyCheckIn } from '@/domain/models/dailyCoaching';

describe('DailyCheckInSheet signal integrity', () => {
  it('enregistre explicitement Douleur ou blessure sans la confondre avec les courbatures', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <DailyCheckInSheet
        open
        date="2026-08-09"
        fallbackWeightKg={71.3}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByText('Contexte inhabituel'));
    await user.click(screen.getByRole('checkbox', { name: 'Douleur ou blessure' }));
    expect(screen.getByRole('checkbox', { name: 'Fortes douleurs musculaires' }))
      .not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Enregistrer le check-in' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      contextFlags: ['painOrInjury'],
    }));
  });

  it('restaure Douleur ou blessure à la réouverture du check-in', async () => {
    const user = userEvent.setup();
    render(
      <DailyCheckInSheet
        open
        date="2026-08-09"
        checkIn={{
          id: 'daily-check-in:2026-08-09',
          date: '2026-08-09',
          contextFlags: ['painOrInjury'],
          contextSyncPreference: 'localOnly',
          completedAt: '2026-08-09T07:00:00.000Z',
          createdAt: '2026-08-09T07:00:00.000Z',
          updatedAt: '2026-08-09T07:00:00.000Z',
        }}
        fallbackWeightKg={71.3}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    await user.click(screen.getByText('Contexte inhabituel'));
    expect(screen.getByRole('checkbox', { name: 'Douleur ou blessure' })).toBeChecked();
  });

  it('omet les signaux subjectifs sans réponse utilisateur', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DailyCheckInSheet
        open
        date="2026-08-09"
        fallbackWeightKg={71.3}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    for (const label of ['Mauvaise', 'Moyenne', 'Bonne', 'Fatigué', 'Normal', 'En forme']) {
      expect(screen.getByRole('radio', { name: label })).toHaveAttribute('aria-checked', 'false');
    }

    await user.click(screen.getByRole('button', { name: 'Enregistrer le check-in' }));

    const payload = onSubmit.mock.calls[0]?.[0];
    expect(payload).not.toHaveProperty('sleepQuality');
    expect(payload).not.toHaveProperty('readiness');
  });

  it('conserve les valeurs neutres lorsqu’elles sont explicitement choisies', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DailyCheckInSheet
        open
        date="2026-08-09"
        fallbackWeightKg={71.3}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'Moyenne' }));
    await user.click(screen.getByRole('radio', { name: 'Normal' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le check-in' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      sleepQuality: 'average',
      readiness: 'normal',
      signalConfirmations: {
        sleepQuality: true,
        readiness: true,
      },
    }));
  });

  it('restaure des réponses legacy sans les confirmer lors d’une sauvegarde globale', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const checkIn: DailyCheckIn = {
      id: 'check-in-1',
      date: '2026-08-09',
      sleepQuality: 'good',
      readiness: 'high',
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-08-09T06:05:00.000Z',
      createdAt: '2026-08-09T06:05:00.000Z',
      updatedAt: '2026-08-09T06:05:00.000Z',
    };

    render(
      <DailyCheckInSheet
        open
        date="2026-08-09"
        checkIn={checkIn}
        fallbackWeightKg={71.3}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Bonne' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'En forme' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le check-in' }));
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('signalConfirmations');
  });

  it('confirme indépendamment les valeurs legacy recliquées', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const checkIn: DailyCheckIn = {
      id: 'check-in-legacy',
      date: '2026-08-09',
      sleepQuality: 'average',
      readiness: 'normal',
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-08-09T06:05:00.000Z',
      createdAt: '2026-08-09T06:05:00.000Z',
      updatedAt: '2026-08-09T06:05:00.000Z',
    };

    render(
      <DailyCheckInSheet
        open
        date="2026-08-09"
        checkIn={checkIn}
        fallbackWeightKg={71.3}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'Moyenne' }));
    await user.click(screen.getByRole('radio', { name: 'Normal' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le check-in' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      signalConfirmations: { sleepQuality: true, readiness: true },
    }));
  });
});
