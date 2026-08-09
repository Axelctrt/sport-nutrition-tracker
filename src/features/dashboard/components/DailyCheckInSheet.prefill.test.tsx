import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DailyCheckInSheet } from '@/features/dashboard/components/DailyCheckInSheet';
import type { WeightEntry } from '@/domain/models/weight';

describe('DailyCheckInSheet weight prefill', () => {
  it('limite le poids de référence prérempli à une décimale et soumet cette valeur', async () => {
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

    expect(screen.getByLabelText('Poids')).toHaveValue(71.3);

    await user.click(
      screen.getByRole('button', { name: 'Enregistrer le check-in' }),
    );

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-08-09',
        weightKg: 71.3,
      }),
    );
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
        weightEntry={weightEntry}
        fallbackWeightKg={71.34255555}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByLabelText('Poids')).toHaveValue(72.45);
  });
});
