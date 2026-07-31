import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { ProgressPhotoAddForm } from '@/features/progress-photos/components/ProgressPhotoAddForm';

describe('ProgressPhotoAddForm', () => {
  it('exige une photo avant l’enregistrement', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ProgressPhotoAddForm onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Enregistrer la photo' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Choisis une photo');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('transmet la vue, la note et un poids saisi avec une virgule', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProgressPhotoAddForm onSave={onSave} />);

    const file = new File(['image'], 'progression.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Choisir une photo de progression'), file);
    await user.selectOptions(screen.getByLabelText('Vue'), 'back');
    await user.type(screen.getByPlaceholderText('Ex. 72,5'), '72,5');
    await user.type(screen.getByPlaceholderText(/Contexte/), 'Même lumière.');
    await user.click(screen.getByRole('button', { name: 'Enregistrer la photo' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      file,
      view: 'back',
      weightKg: 72.5,
      note: 'Même lumière.',
    }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'La photo a été enregistrée uniquement dans cet espace local.',
    );
    expect(screen.getByLabelText('Choisir une photo de progression')).toHaveValue('');
  });
});
