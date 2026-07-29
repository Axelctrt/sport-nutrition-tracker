import { fireEvent, render, screen } from '@testing-library/react';
import { DateContextBanner } from '@/shared/ui/DateContextBanner';
import { relativeDateLabel } from '@/shared/utils/relativeDateLabel';

it('nomme les dates proches avec une convention commune', () => {
  expect(relativeDateLabel('2026-07-26', '2026-07-27')).toBe('Hier');
  expect(relativeDateLabel('2026-07-27', '2026-07-27')).toBe('Aujourd’hui');
  expect(relativeDateLabel('2026-07-28', '2026-07-27')).toBe('Demain');
});

it('permet de revenir à aujourd’hui depuis une journée différente', () => {
  const onReturnToday = vi.fn();
  render(
    <DateContextBanner
      date="2026-07-24"
      onReturnToday={onReturnToday}
    />,
  );

  expect(screen.getByText(/Journée du 24 juillet/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Revenir à aujourd’hui' }));
  expect(onReturnToday).toHaveBeenCalledOnce();
});
