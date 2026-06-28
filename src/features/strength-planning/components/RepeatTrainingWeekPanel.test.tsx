import {
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RepeatTrainingWeekPanel } from '@/features/strength-planning/components/RepeatTrainingWeekPanel';
import { ToastProvider } from '@/shared/toast/ToastProvider';

describe('RepeatTrainingWeekPanel', () => {
  it('confirme la copie, affiche le bilan et ouvre la semaine cible', async () => {
    const user = userEvent.setup();
    const onOpenWeek = vi.fn();

    const repeatWeek = vi.fn().mockResolvedValue({
      sourceWeekStart: '2026-06-29',
      targetWeekStart: '2026-07-06',
      createdStrengthCount: 2,
      createdEnduranceCount: 1,
      ignoredStrengthCount: 1,
      ignoredEnduranceCount: 0,
      failedStrengthCount: 0,
    });

    render(
      <ToastProvider>
        <RepeatTrainingWeekPanel
          weekStart="2026-06-29"
          onOpenWeek={onOpenWeek}
          repeatWeek={repeatWeek}
        />
      </ToastProvider>,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Copier la semaine',
      }),
    );

    const dialog = screen.getByRole(
      'alertdialog',
      {
        name: 'Répéter cette semaine ?',
      },
    );

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Copier la semaine',
      }),
    );

    expect(
      await screen.findByText(
        'Semaine répétée',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '3 séances ajoutées · 1 doublon ignoré',
      ),
    ).toBeInTheDocument();
    expect(repeatWeek).toHaveBeenCalledWith(
      expect.any(Object),
      '2026-06-29',
      '2026-07-06',
    );
    expect(onOpenWeek).toHaveBeenCalledWith(
      '2026-07-06',
    );
  });
});
