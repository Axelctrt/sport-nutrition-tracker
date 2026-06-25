import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BackupDeleteDialog } from '@/features/backup/components/BackupDeleteDialog';

describe('BackupDeleteDialog', () => {
  it('exige la saisie exacte avant la suppression définitive', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <BackupDeleteDialog open isPending={false} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Effacer définitivement' });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText('Saisis EFFACER pour confirmer'), 'EFFACER');
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('se ferme avec la touche Échap', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <BackupDeleteDialog open isPending={false} onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
