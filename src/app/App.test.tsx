import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/app/App';
import { router } from '@/app/router';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { appDatabase } from '@/infrastructure/database/database';
import { repositories } from '@/infrastructure/repositories/repositories';
import { createProfileInput } from '@/test/factories/profileFactory';
import '@/features/onboarding/pages/OnboardingPage';
import '@/features/dashboard/pages/DashboardPage';

describe('App', () => {
  beforeEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
    window.localStorage.clear();
    await router.navigate('/');
  });

  afterEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
  });

  it('affiche le splash initial puis redirige vers l’onboarding quand aucun profil n’existe', async () => {
    render(<App />);

    expect(screen.getByTestId('app-splash-screen')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Créer le profil local' }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('app-splash-screen')).not.toBeInTheDocument();
  }, 15_000);

  it('crée un profil avec les valeurs initiales puis ouvre le tableau de bord', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Créer le profil local' }, { timeout: 5_000 });
    await user.click(screen.getByRole('button', { name: 'Créer mon profil' }));

    await waitFor(
      () => expect(router.state.location.pathname).toBe('/'),
      { timeout: 10_000 },
    );
    expect(
      await screen.findByRole('link', { name: 'Tableau de bord' }, { timeout: 12_000 }),
    ).toHaveAttribute('aria-current', 'page');
    expect(await repositories.profile.get()).toMatchObject({
      heightCm: 175,
      initialWeightKg: 70,
      goal: 'maintenance',
    });
  }, 15_000);

  it('affiche directement le tableau de bord quand un profil existe', async () => {
    await initializeDatabase();
    await repositories.profile.save(createProfileInput());

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Bonjour Axel' }, { timeout: 5_000 }),
    ).toBeInTheDocument();
  });
});
