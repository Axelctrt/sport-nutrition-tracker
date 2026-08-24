import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DailyCheckInSheet } from '@/features/dashboard/components/DailyCheckInSheet';
import type { WeightEntry } from '@/domain/models/weight';

describe('DailyCheckInSheet weight prefill', () => {
  it('ne transforme pas le poids de référence en pesée sans choix explicite', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DailyCheckInSheet
        open
        date="2026-08-09"
        fallbackWeightKg={71.34255555}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Pas aujourd’hui' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.queryByLabelText('Poids')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Enregistrer le check-in' }),
    );

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-08-09',
      weightKg: null,
    }));
  });

  it('permet une pesée explicite sans perdre le repère prérempli', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DailyCheckInSheet
        open
        date="2026-08-09"
        fallbackWeightKg={71.34255555}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'Me peser' }));
    expect(screen.getByLabelText('Poids')).toHaveValue(71.3);
    await user.clear(screen.getByLabelText('Poids'));
    await user.type(screen.getByLabelText('Poids'), '72.1');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le check-in' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-08-09',
      weightKg: 72.1,
    }));
  });

  it('conserve la pesée réelle du jour lorsqu’elle existe déjà', () => {
    const weightEntry: WeightEntry = {
      id: 'weight-1',
      date: '2026-08-09',
      weightKg: 72.45,
      createdAt: '2026-08-09T06:00:00.000Z',
      updatedAt: '2026-08-09T06:00:00.000Z',
    };

    render(
      <DailyCheckInSheet
        open
        date="2026-08-09"
        checkIn={{
          id: 'check-in-1',
          date: '2026-08-09',
          weightEntryId: weightEntry.id,
          contextFlags: [],
          contextSyncPreference: 'localOnly',
          completedAt: '2026-08-09T06:05:00.000Z',
          createdAt: '2026-08-09T06:05:00.000Z',
          updatedAt: '2026-08-09T06:05:00.000Z',
        }}
        weightEntry={weightEntry}
        fallbackWeightKg={71.34255555}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Me peser' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Poids')).toHaveValue(72.45);
  });
});
