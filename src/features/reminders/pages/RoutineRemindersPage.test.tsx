import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RoutineRemindersPage } from '@/features/reminders/pages/RoutineRemindersPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { repositories } from '@/infrastructure/repositories/repositories';

describe('RoutineRemindersPage', () => {
  beforeEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    appDatabase.close();
    await appDatabase.delete();
    await initializeDatabase();
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    appDatabase.close();
    await appDatabase.delete();
  });

  it('conserve le succès dans le bouton sans confirmation séparée', async () => {
    const user = userEvent.setup();
    render(<RoutineRemindersPage />);

    await user.click(await screen.findByRole('button', { name: 'Enregistrer les rappels' }));

    expect(await screen.findByRole('button', { name: 'Enregistré' })).toHaveAttribute(
      'data-state',
      'success',
    );
    expect(screen.queryByText('Préférences enregistrées.')).not.toBeInTheDocument();
  });

  it('affiche l’erreur localement et transforme le bouton en action de reprise', async () => {
    const user = userEvent.setup();
    vi.spyOn(repositories.settings, 'update').mockRejectedValueOnce(
      new Error('Écriture locale indisponible.'),
    );

    render(<RoutineRemindersPage />);

    await user.click(await screen.findByRole('button', { name: 'Enregistrer les rappels' }));

    expect(await screen.findByRole('button', { name: 'Réessayer' })).toHaveAttribute(
      'data-state',
      'error',
    );
    expect(screen.getByText(/Impossible d’enregistrer les rappels/)).toBeInTheDocument();
  });
});
