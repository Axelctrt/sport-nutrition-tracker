import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyCheckInSheet } from '@/features/dashboard/components/DailyCheckInSheet';

describe('DailyCheckInSheet focus', () => {
  it('focalise le premier controle des sections facultatives ouvertes', async () => {
    const user = userEvent.setup();
    render(
      <DailyCheckInSheet
        open
        date="2026-07-29"
        fallbackWeightKg={61.5}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(screen.getByText(/Tour de taille/, { selector: 'summary' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Tour de taille')).toHaveFocus();
    });

    await user.click(screen.getByText('Contexte inhabituel'));
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Règles ou rétention/ })).toHaveFocus();
    });
  });
});
