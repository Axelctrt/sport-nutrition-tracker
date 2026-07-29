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
import { readProfileOnboardingCompletion } from '@/features/onboarding/storage/onboardingCompletionStorage';
import '@/features/onboarding/pages/OnboardingPage';
import '@/features/dashboard/pages/DashboardPage';

vi.mock('@/app/data-spaces/DataSpaceAccountGate', () => ({
  DataSpaceAccountGate: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/app/social-identity/SocialIdentityAccountGate', () => ({
  SocialIdentityAccountGate: ({ children }: { children: ReactNode }) => children,
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
    window.sessionStorage.clear();
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
      await screen.findByRole('heading', { name: 'Comment utiliser SportPilot ?' }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('app-splash-screen')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement.style.overflow).toBe('hidden');
      expect(document.body.style.overflow).toBe('hidden');
    });
  }, 15_000);

  it('crée un profil avec les valeurs initiales puis ouvre le tableau de bord', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Comment utiliser SportPilot ?' }, { timeout: 5_000 });
    await user.click(screen.getByRole('button', { name: 'Choisir le mode local' }));
    await screen.findByRole('heading', {
      name: 'Comment vous appeler ?',
    }, { timeout: 5_000 });
    await user.type(screen.getByLabelText(/Nom affiché/), 'Axel');
    await waitFor(() => {
      expect(screen.getByLabelText(/Nom affiché/)).toHaveValue('Axel');
    });
    await waitFor(() => {
      const serializedDraft = window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);
      expect(serializedDraft).not.toBeNull();
      expect(serializedDraft).toContain('Axel');
    });

    for (const heading of [
      'Sexe utilisé pour les calculs',
      'Quelle est votre date de naissance ?',
      'Quelle est votre taille ?',
      'Quel est votre poids actuel ?',
      'Quel est votre objectif ?',
      'Quel est votre niveau d’activité ?',
      'Quel objectif de pas quotidien ?',
    ]) {
      await user.click(screen.getByRole('button', { name: 'Continuer' }));
      await screen.findByRole('heading', { name: heading });
    }

    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await screen.findByRole('heading', { name: 'Votre profil est prêt' });
    expect(screen.getByText('Axel')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Modifier le poids' }));
    await screen.findByRole('heading', { name: 'Quel est votre poids actuel ?' });
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await screen.findByRole('heading', { name: 'Votre profil est prêt' });
    await user.click(screen.getByRole('button', { name: 'Commencer' }));

    await waitFor(
      () => expect(router.state.location.pathname).toBe('/'),
      { timeout: 10_000 },
    );
    const homeLinks = await screen.findAllByRole(
      'link',
      { name: 'Accueil' },
      { timeout: 12_000 },
    );
    expect(homeLinks.every((link) => link.getAttribute('aria-current') === 'page')).toBe(true);
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
    expect(await repositories.weight.listAll()).toEqual([
      expect.objectContaining({ weightKg: 70 }),
    ]);
    expect(readProfileOnboardingCompletion()).toMatchObject({ version: 1 });
    await waitFor(() => {
      expect(document.documentElement.style.overflow).not.toBe('hidden');
      expect(document.body.style.overflow).not.toBe('hidden');
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
