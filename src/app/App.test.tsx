import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { App } from '@/app/App';
import { router } from '@/app/router';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { appDatabase } from '@/infrastructure/database/database';
import { repositories } from '@/infrastructure/repositories/repositories';
import { flushUserStatePersistence } from '@/infrastructure/user-state/userStateRuntime';
import { createProfileInput } from '@/test/factories/profileFactory';
import { ONBOARDING_DRAFT_STORAGE_KEY } from '@/features/onboarding/storage/onboardingDraftStorage';
import '@/features/onboarding/pages/OnboardingPage';
import '@/features/dashboard/pages/DashboardPage';

vi.mock('@/app/data-spaces/DataSpaceAccountGate', () => ({
  DataSpaceAccountGate: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/app/sync/WeightSyncCoordinator', () => ({
  WeightSyncCoordinator: () => null,
}));

vi.mock('@/app/sync/AutomaticSyncCoordinator', () => ({
  AutomaticSyncCoordinator: () => null,
}));

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
      await screen.findByRole('heading', { name: 'Choisir le mode local ou compte' }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('app-splash-screen')).not.toBeInTheDocument();
  }, 15_000);

  it('crée un profil avec les valeurs initiales puis ouvre le tableau de bord', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Choisir le mode local ou compte' }, { timeout: 5_000 });
    await user.click(screen.getByRole('button', { name: 'Choisir le mode local' }));
    await screen.findByRole('heading', {
      name: 'Comment souhaitez-vous être appelé dans SportPilot ?',
    }, { timeout: 5_000 });
    await user.type(screen.getByLabelText(/Nom utilisé dans SportPilot/), 'Axel');
    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).not.toBeNull();

    for (const heading of [
      'Quel sexe doit être utilisé pour les calculs énergétiques ?',
      'Quelle est votre date de naissance ?',
      'Quelle est votre taille ?',
      'Quel est votre poids actuel ?',
      'Quel est votre objectif principal ?',
      'À quoi ressemble votre activité professionnelle ?',
      'Quel objectif de pas souhaitez-vous viser chaque jour ?',
    ]) {
      await user.click(screen.getByRole('button', { name: 'Suivant' }));
      await screen.findByRole('heading', { name: heading });
    }

    await user.click(screen.getByRole('button', { name: 'Créer mon profil' }));

    await waitFor(
      () => expect(router.state.location.pathname).toBe('/'),
      { timeout: 10_000 },
    );
    expect(
      await screen.findByRole('link', { name: 'Tableau de bord' }, { timeout: 12_000 }),
    ).toHaveAttribute('aria-current', 'page');
    await act(async () => {
      await flushUserStatePersistence();
    });
    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();
    expect(await repositories.profile.get()).toMatchObject({
      firstName: 'Axel',
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
