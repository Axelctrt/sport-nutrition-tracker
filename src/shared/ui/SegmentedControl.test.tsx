import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';

const items = [
  { value: 'low', label: 'Faible' },
  { value: 'normal', label: 'Normale' },
  { value: 'high', label: 'Forte' },
] as const;

describe('SegmentedControl', () => {
  it('reste accessible au clavier sans sélection initiale', () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="Faim" items={items} onChange={onChange} />);

    const radios = screen.getAllByRole('radio');
    expect(screen.getByRole('radiogroup', { name: 'Faim' })).toBeInTheDocument();
    expect(radios.every((radio) => radio.getAttribute('aria-checked') === 'false')).toBe(true);
    expect(radios[0]).toHaveAttribute('tabindex', '0');
    expect(radios[1]).toHaveAttribute('tabindex', '-1');

    radios[0]!.focus();
    fireEvent.keyDown(radios[0]!, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('normal');
    expect(radios[1]).toHaveFocus();

    fireEvent.keyDown(radios[1]!, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('high');
    expect(radios[2]).toHaveFocus();

    fireEvent.keyDown(radios[2]!, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('low');
    expect(radios[0]).toHaveFocus();
  });

  it('sélectionne normalement au clic ou au tap', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl label="Faim" items={items} onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'Normale' }));

    expect(onChange).toHaveBeenCalledWith('normal');
  });
});
