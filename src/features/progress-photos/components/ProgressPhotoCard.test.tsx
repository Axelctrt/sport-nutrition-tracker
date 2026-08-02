import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { ProgressPhoto } from '@/domain/models/progressPhoto';
import { ProgressPhotoCard } from '@/features/progress-photos/components/ProgressPhotoCard';

const photo: ProgressPhoto = {
  id: 'photo-1',
  date: '2026-07-31',
  view: 'front',
  weightKg: 72.5,
  note: 'Même lumière.',
  originalFileName: 'face.jpg',
  originalAssetId: 'photo-1:original',
  thumbnailAssetId: 'photo-1:thumbnail',
  mimeType: 'image/jpeg',
  width: 1200,
  height: 1600,
  byteSize: 512_000,
  createdAt: '2026-07-31T10:00:00.000Z',
  updatedAt: '2026-07-31T10:00:00.000Z',
};

describe('ProgressPhotoCard', () => {
  it('conserve le résumé visible et révèle les détails à la demande', async () => {
    const user = userEvent.setup();
    render(
      <ProgressPhotoCard
        photo={photo}
        thumbnailUrl="blob:thumbnail"
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole('heading', { name: /31 juillet 2026/ })).toBeVisible();
    expect(screen.queryByText('Fichier local')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', {
      name: /Afficher les détails de la photo face du 31 juillet 2026/,
    });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Fichier local')).toBeVisible();
    expect(screen.getByText(/1200 × 1600/)).toBeVisible();
    expect(screen.getAllByText('Même lumière.').length).toBeGreaterThan(0);
  });

  it('confirme la suppression définitive avant d’appeler le repository', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <ProgressPhotoCard
        photo={photo}
        thumbnailUrl="blob:thumbnail"
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', {
      name: /Supprimer la photo du 31 juillet 2026/,
    }));
    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer cette photo ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }));

    expect(onDelete).toHaveBeenCalledWith('photo-1');
  });
});
