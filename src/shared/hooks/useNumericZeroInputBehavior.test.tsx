import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useNumericZeroInputBehavior } from '@/shared/hooks/useNumericZeroInputBehavior';

function ControlledNumberInput() {
  useNumericZeroInputBehavior();
  const [value, setValue] = useState('0');

  return (
    <>
      <label htmlFor="value">Valeur</label>
      <input id="value" type="number" value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="button">Suivant</button>
    </>
  );
}

describe('useNumericZeroInputBehavior', () => {
  it('efface un zéro au focus pour permettre une saisie directe', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberInput />);

    const input = screen.getByLabelText('Valeur');
    await user.click(input);
    expect(input).toHaveValue(null);

    await user.type(input, '62.5');
    expect(input).toHaveValue(62.5);
  });

  it('restaure zéro si le champ est quitté sans nouvelle valeur', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberInput />);

    const input = screen.getByLabelText('Valeur');
    await user.click(input);
    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(input).toHaveValue(0);
  });
});
