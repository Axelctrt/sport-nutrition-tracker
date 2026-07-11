import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useClearInputValueOnFocus } from '@/shared/forms/useClearInputValueOnFocus';

function TestForm() {
  const [value, setValue] = useState('60');
  const [note, setNote] = useState('ancien texte');
  useClearInputValueOnFocus();
  return (
    <form>
      <label htmlFor="weight">Charge</label>
      <input id="weight" type="number" value={value} onChange={(event) => setValue(event.target.value)} />
      <label htmlFor="note">Note</label>
      <textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} />
      <label htmlFor="search">Recherche</label>
      <input id="search" type="search" defaultValue="yaourt" />
      <button type="button">Fin</button>
    </form>
  );
}

describe('useClearInputValueOnFocus', () => {
  it('vide un champ au focus puis restaure sa valeur si rien n’est saisi', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const input = screen.getByLabelText('Charge');
    expect(input).toHaveValue(60);

    await user.click(input);
    expect(input).toHaveValue(null);

    await user.click(screen.getByRole('button', { name: 'Fin' }));
    expect(input).toHaveValue(60);
  });

  it('conserve la nouvelle valeur saisie', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const input = screen.getByLabelText('Charge');
    await user.click(input);
    await user.type(input, '75');
    await user.click(screen.getByRole('button', { name: 'Fin' }));

    expect(input).toHaveValue(75);
  });

  it('fonctionne aussi avec les zones de texte et ignore la recherche', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const note = screen.getByLabelText('Note');
    await user.click(note);
    expect(note).toHaveValue('');
    await user.type(note, 'nouveau');
    expect(note).toHaveValue('nouveau');

    const search = screen.getByLabelText('Recherche');
    await user.click(search);
    expect(search).toHaveValue('yaourt');
  });
});
