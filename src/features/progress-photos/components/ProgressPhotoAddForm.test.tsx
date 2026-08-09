import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { ProgressPhotoAddForm } from '@/features/progress-photos/components/ProgressPhotoAddForm';

describe('ProgressPhotoAddForm', () => {
  it('reste propre au chargement puis suit les modifications réversibles', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    render(
      <ProgressPhotoAddForm
        onSave={vi.fn()}
        onDirtyChange={onDirtyChange}
      />,
    );

    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));

    const file = new File(['image'], 'progression.png', { type: 'image/png' });
    await user.upload(screen.getByTestId('progress-photo-input'), file);
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));

    await user.click(screen.getByRole('button', { name: 'Retirer' }));
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));

    await user.selectOptions(screen.getByLabelText('Vue'), 'back');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    await user.selectOptions(screen.getByLabelText('Vue'), 'front');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));

    const weightInput = screen.getByPlaceholderText('Ex. 72,5');
    await user.type(weightInput, '72,5');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    await user.clear(weightInput);
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));

    const noteInput = screen.getByPlaceholderText(/Contexte/);
    await user.type(noteInput, 'Même lumière.');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    await user.clear(noteInput);
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));

    const dateInput = screen.getByLabelText('Date');
    const initialDate = (dateInput as HTMLInputElement).value;
    fireEvent.change(dateInput, { target: { value: '2020-01-01' } });
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    fireEvent.change(dateInput, { target: { value: initialDate } });
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  });

  it('propose une seule action native sans imposer la caméra', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ProgressPhotoAddForm onSave={onSave} />);

    const input = screen.getByTestId('progress-photo-input');
    const inputClick = vi.fn();
    input.addEventListener('click', inputClick);

    expect(input).not.toHaveAttribute('capture');
    expect(input).toHaveAccessibleName('Choisir une photo');
    expect(screen.queryByText('Prendre une photo')).not.toBeInTheDocument();
    expect(screen.queryByText('Choisir dans la galerie')).not.toBeInTheDocument();

    await user.click(screen.getByText('Choisir une photo'));
    expect(inputClick).toHaveBeenCalledOnce();
  });

  it('exige une photo avant l’enregistrement', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ProgressPhotoAddForm onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Enregistrer la photo' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Choisis une photo');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('alimente le pipeline existant depuis le choix natif', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDirtyChange = vi.fn();
    render(
      <ProgressPhotoAddForm
        onSave={onSave}
        onDirtyChange={onDirtyChange}
      />,
    );

    const file = new File(['image'], 'progression.png', { type: 'image/png' });
    const fileInput = screen.getByTestId('progress-photo-input') as HTMLInputElement;
    await user.upload(fileInput, file);
    expect(screen.getByAltText('Aperçu de la photo sélectionnée')).toBeVisible();
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
    expect(fileInput.value).toBe('');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  });

  it('reste modifié lorsque l’enregistrement échoue', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    render(
      <ProgressPhotoAddForm
        onSave={vi.fn().mockRejectedValue(new Error('Échec ciblé.'))}
        onDirtyChange={onDirtyChange}
      />,
    );

    await user.upload(
      screen.getByTestId('progress-photo-input'),
      new File(['image'], 'progression.png', { type: 'image/png' }),
    );
    await user.click(screen.getByRole('button', { name: 'Enregistrer la photo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Échec ciblé.');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it('permet de sélectionner de nouveau le même fichier après retrait', async () => {
    const user = userEvent.setup();
    render(<ProgressPhotoAddForm onSave={vi.fn()} />);
    const photoInput = screen.getByTestId(
      'progress-photo-input',
    ) as HTMLInputElement;
    const file = new File(['image'], 'meme-photo.png', { type: 'image/png' });

    await user.upload(photoInput, file);
    expect(screen.getByAltText('Aperçu de la photo sélectionnée')).toBeVisible();
    expect(photoInput.value).toBe('');

    await user.click(screen.getByRole('button', { name: 'Retirer' }));
    expect(screen.queryByAltText('Aperçu de la photo sélectionnée')).not.toBeInTheDocument();

    await user.upload(photoInput, file);
    expect(screen.getByAltText('Aperçu de la photo sélectionnée')).toBeVisible();
  });
});
