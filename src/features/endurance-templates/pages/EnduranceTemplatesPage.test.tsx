import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EnduranceTemplatesPage } from '@/features/endurance-templates/pages/EnduranceTemplatesPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';

beforeEach(async () => {
  cleanup();
  appDatabase.close();
  await appDatabase.delete();
  await initializeDatabase();
});

afterEach(async () => {
  cleanup();
  appDatabase.close();
  await appDatabase.delete();
});

describe('EnduranceTemplatesPage', () => {
  it('affiche les modèles par défaut et enregistre un modèle vélo', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EnduranceTemplatesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Course facile 45 min' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Natation endurance 1 500 m' })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Nom/), 'Vélo souple');
    await user.selectOptions(screen.getByLabelText(/Sport/), 'cycling');
    await user.clear(screen.getByLabelText(/Durée \(min\)/));
    await user.type(screen.getByLabelText(/Durée \(min\)/), '75');
    await user.clear(screen.getByLabelText('Distance (km)'));
    await user.type(screen.getByLabelText('Distance (km)'), '32');
    await user.click(screen.getByRole('button', { name: 'Créer le modèle' }));

    expect(await screen.findByRole('heading', { name: 'Vélo souple' })).toBeInTheDocument();
    await waitFor(async () => {
      const settings = await appDatabase.userSettings.toCollection().first();
      expect(settings?.enduranceTemplates).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Vélo souple', activityType: 'cycling', distanceKm: 32 })]),
      );
    });
  });
});
