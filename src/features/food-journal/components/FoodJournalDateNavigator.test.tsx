import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FoodJournalDateNavigator } from '@/features/food-journal/components/FoodJournalDateNavigator';

describe('FoodJournalDateNavigator', () => {
  it('navigue vers les journées précédente et suivante', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<FoodJournalDateNavigator date="2026-07-10" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Jour précédent' }));
    await user.click(screen.getByRole('button', { name: 'Jour suivant' }));

    expect(onChange).toHaveBeenNthCalledWith(1, '2026-07-09');
    expect(onChange).toHaveBeenNthCalledWith(2, '2026-07-11');
  });

  it('permet de choisir directement une date', async () => {
    const onChange = vi.fn();

    render(<FoodJournalDateNavigator date="2026-07-10" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Choisir une date'), {
      target: { value: '2026-07-12' },
    });

    expect(onChange).toHaveBeenLastCalledWith('2026-07-12');
  });
});
