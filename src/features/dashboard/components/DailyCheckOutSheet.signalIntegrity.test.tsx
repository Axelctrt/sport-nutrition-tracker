import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyCheckOutSheet } from '@/features/dashboard/components/DailyCheckOutSheet';
import type { DailyCheckOut } from '@/domain/models/dailyCoaching';

const baseProps = {
  open: true,
  date: '2026-08-09',
  foodJournalComplete: false,
  consumedCaloriesKcal: 1_800,
  completedActivityCount: 1,
  unresolvedPlannedCount: 0,
  onClose: vi.fn(),
};

describe('DailyCheckOutSheet signal integrity', () => {
  it('omet faim et énergie sans réponse utilisateur', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<DailyCheckOutSheet {...baseProps} onSubmit={onSubmit} />);

    for (const groupName of ['Faim dans la journée', 'Énergie générale']) {
      const group = screen.getByRole('radiogroup', { name: groupName });
      for (const radio of within(group).getAllByRole('radio')) {
        expect(radio).toHaveAttribute('aria-checked', 'false');
      }
    }

    await user.click(screen.getByRole('button', { name: 'Clôturer la journée' }));

    const payload = onSubmit.mock.calls[0]?.[0];
    expect(payload).not.toHaveProperty('hunger');
    expect(payload).not.toHaveProperty('energy');
  });

  it('persiste les niveaux neutres explicitement choisis', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<DailyCheckOutSheet {...baseProps} onSubmit={onSubmit} />);

    await user.click(within(
      screen.getByRole('radiogroup', { name: 'Faim dans la journée' }),
    ).getByRole('radio', { name: 'Normale' }));
    await user.click(within(
      screen.getByRole('radiogroup', { name: 'Énergie générale' }),
    ).getByRole('radio', { name: 'Normale' }));
    await user.click(screen.getByRole('button', { name: 'Clôturer la journée' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      hunger: 'normal',
      energy: 'normal',
    }));
  });

  it('restaure les réponses réellement enregistrées lors de l’édition', () => {
    const checkOut: DailyCheckOut = {
      id: 'check-out-1',
      date: '2026-08-09',
      hunger: 'high',
      energy: 'low',
      foodJournalComplete: true,
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-08-09T20:00:00.000Z',
      createdAt: '2026-08-09T20:00:00.000Z',
      updatedAt: '2026-08-09T20:00:00.000Z',
    };

    render(<DailyCheckOutSheet {...baseProps} checkOut={checkOut} onSubmit={vi.fn()} />);

    expect(within(
      screen.getByRole('radiogroup', { name: 'Faim dans la journée' }),
    ).getByRole('radio', { name: 'Forte' })).toHaveAttribute('aria-checked', 'true');
    expect(within(
      screen.getByRole('radiogroup', { name: 'Énergie générale' }),
    ).getByRole('radio', { name: 'Faible' })).toHaveAttribute('aria-checked', 'true');
  });
});
