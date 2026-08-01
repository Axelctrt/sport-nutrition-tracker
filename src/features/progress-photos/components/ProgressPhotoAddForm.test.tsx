import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { ProgressPhotoAddForm } from '@/features/progress-photos/components/ProgressPhotoAddForm';

describe('ProgressPhotoAddForm', () => {
  it('sépare la caméra arrière de la galerie avec deux actions accessibles', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ProgressPhotoAddForm onSave={onSave} />);

    const cameraInput = screen.getByTestId('progress-photo-camera-input');
    const galleryInput = screen.getByTestId('progress-photo-gallery-input');
    const cameraClick = vi.fn();
    const galleryClick = vi.fn();
    cameraInput.addEventListener('click', cameraClick);
    galleryInput.addEventListener('click', galleryClick);

    expect(cameraInput).toHaveAttribute('capture', 'environment');
    expect(cameraInput).toHaveAccessibleName('Prendre une photo');
    expect(galleryInput).not.toHaveAttribute('capture');
    expect(galleryInput).toHaveAccessibleName('Choisir dans la galerie');

    await user.click(screen.getByText('Prendre une photo'));
    expect(cameraClick).toHaveBeenCalledOnce();
    expect(galleryClick).not.toHaveBeenCalled();

    await user.click(screen.getByText('Choisir dans la galerie'));
    expect(galleryClick).toHaveBeenCalledOnce();
  });

  it('exige une photo avant l’enregistrement', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ProgressPhotoAddForm onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Enregistrer la photo' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Choisis une photo');
    expect(onSave).not.toHaveBeenCalled();
  });

  it.each([
    ['caméra', 'progress-photo-camera-input'],
    ['galerie', 'progress-photo-gallery-input'],
  ])('alimente le même pipeline depuis la %s', async (_source, inputTestId) => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProgressPhotoAddForm onSave={onSave} />);

    const file = new File(['image'], 'progression.png', { type: 'image/png' });
    const fileInput = screen.getByTestId(inputTestId) as HTMLInputElement;
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
  });

  it('permet de sélectionner de nouveau le même fichier après retrait', async () => {
    const user = userEvent.setup();
    render(<ProgressPhotoAddForm onSave={vi.fn()} />);
    const galleryInput = screen.getByTestId(
      'progress-photo-gallery-input',
    ) as HTMLInputElement;
    const file = new File(['image'], 'meme-photo.png', { type: 'image/png' });

    await user.upload(galleryInput, file);
    expect(screen.getByAltText('Aperçu de la photo sélectionnée')).toBeVisible();
    expect(galleryInput.value).toBe('');

    await user.click(screen.getByRole('button', { name: 'Retirer' }));
    expect(screen.queryByAltText('Aperçu de la photo sélectionnée')).not.toBeInTheDocument();

    await user.upload(galleryInput, file);
    expect(screen.getByAltText('Aperçu de la photo sélectionnée')).toBeVisible();
  });
});
