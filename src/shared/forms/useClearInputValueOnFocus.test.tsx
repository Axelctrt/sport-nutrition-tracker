import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useClearInputValueOnFocus } from '@/shared/forms/useClearInputValueOnFocus';

function TestForm() {
  const [quickValue, setQuickValue] = useState('60');
  const [regularValue, setRegularValue] = useState('42');
  const [note, setNote] = useState('ancien texte');
  useClearInputValueOnFocus();
  return (
    <form>
      <label htmlFor="quick-value">Charge rapide</label>
      <input
        id="quick-value"
        data-clear-on-focus="true"
        type="number"
        value={quickValue}
        onChange={(event) => setQuickValue(event.target.value)}
      />
      <label htmlFor="regular-value">Valeur normale</label>
      <input
        id="regular-value"
        type="number"
        value={regularValue}
        onChange={(event) => setRegularValue(event.target.value)}
      />
      <label htmlFor="note">Note</label>
      <textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} />
      <label htmlFor="search">Recherche</label>
      <input id="search" data-clear-on-focus="true" type="search" defaultValue="yaourt" />
      <button type="button">Fin</button>
    </form>
  );
}

describe('useClearInputValueOnFocus', () => {
  it('vide uniquement un champ explicitement ciblé puis restaure sa valeur sans saisie', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const input = screen.getByLabelText('Charge rapide');
    expect(input).toHaveValue(60);

    await user.click(input);
    expect(input).toHaveValue(null);

    await user.click(screen.getByRole('button', { name: 'Fin' }));
    expect(input).toHaveValue(60);
  });

  it('conserve la nouvelle valeur saisie dans un champ ciblé', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const input = screen.getByLabelText('Charge rapide');
    await user.click(input);
    await user.type(input, '75');
    await user.click(screen.getByRole('button', { name: 'Fin' }));

    expect(input).toHaveValue(75);
  });

  it('préserve par défaut les nombres, les notes et les recherches préremplis', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const regularValue = screen.getByLabelText('Valeur normale');
    await user.click(regularValue);
    expect(regularValue).toHaveValue(42);

    const note = screen.getByLabelText('Note');
    await user.click(note);
    expect(note).toHaveValue('ancien texte');

    const search = screen.getByLabelText('Recherche');
    await user.click(search);
    expect(search).toHaveValue('yaourt');
  });
});
