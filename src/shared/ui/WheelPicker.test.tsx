import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WheelPicker } from '@/shared/ui/WheelPicker';

describe('WheelPicker', () => {
  beforeEach(() => {
    const scrollTo = vi.fn(function scrollTo(
      this: Element,
      optionsOrX?: ScrollToOptions | number,
      y?: number,
    ) {
      const top = typeof optionsOrX === 'number' ? (y ?? 0) : optionsOrX?.top;
      if (typeof top === 'number') {
        Object.defineProperty(this, 'scrollTop', { configurable: true, writable: true, value: top });
      }
    });
    Object.defineProperty(Element.prototype, 'scrollTo', {
      configurable: true,
      writable: true,
      value: scrollTo,
    });
  });

  it('change de valeur au clavier sans ouvrir de champ', async () => {
    const onChange = vi.fn();
    render(<WheelPicker label="Taille" value="175" options={[{ value: '174', label: '174 cm' }, { value: '175', label: '175 cm' }, { value: '176', label: '176 cm' }]} onChange={onChange} />);
    const picker = screen.getByRole('listbox', { name: 'Taille' });
    await userEvent.click(picker);
    fireEvent.keyDown(picker, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledWith('176');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('sélectionne l’option touchée dans la zone défilante', async () => {
    const onChange = vi.fn();
    render(<WheelPicker label="Poids" value="70" options={[{ value: '70', label: '70 kg' }, { value: '70.5', label: '70,5 kg' }]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('option', { name: '70,5 kg' }));
    expect(onChange).toHaveBeenCalledWith('70.5');
  });
});
