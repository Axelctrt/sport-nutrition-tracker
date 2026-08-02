import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ProfileContext } from '@/app/providers/profile/ProfileContext';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { createProfileInput } from '@/test/factories/profileFactory';
import { ToastProvider } from '@/shared/toast/ToastProvider';

const mocks = vi.hoisted(() => ({
  previewProfileImpact: vi.fn(),
  recalculateTarget: vi.fn(),
}));

vi.mock('@/application/profile/profileImpactService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/application/profile/profileImpactService')>();
  return {
    ...actual,
    previewProfileImpact: mocks.previewProfileImpact,
  };
});

vi.mock('@/application/daily/dailyTargetCoordinator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/application/daily/dailyTargetCoordinator')>();
  return {
    ...actual,
    calculateAndPersistDailyTarget: mocks.recalculateTarget,
  };
});

vi.mock('@/features/weight/hooks/useCurrentWeight', () => ({
  useCurrentWeight: () => ({
    status: 'ready',
    currentWeight: {
      source: 'entry',
      weightKg: 59.8,
      measuredAt: '2026-07-10',
      entry: {
        id: 'weight:2026-07-10',
        date: '2026-07-10',
        weightKg: 59.8,
        createdAt: '2026-07-10T08:00:00.000Z',
        updatedAt: '2026-07-10T08:00:00.000Z',
      },
    },
  }),
}));

const storedProfile = {
  ...createProfileInput(),
  id: 'profile-1',
  createdAt: '2026-06-24T10:00:00.000Z',
  updatedAt: '2026-06-24T10:00:00.000Z',
};

const impactPreview = {
  date: '2026-07-10',
  changedFields: ['goal', 'targetWeeklyWeightChangePercent'] as const,
  changedFieldLabels: ['objectif', 'variation hebdomadaire'],
  before: {
    targetCaloriesKcal: 2400,
    macros: { proteinGrams: 108, carbohydratesGrams: 322, fatGrams: 54 },
    calculationWeightKg: 60,
  },
  after: {
    targetCaloriesKcal: 2180,
    macros: { proteinGrams: 108, carbohydratesGrams: 267, fatGrams: 54 },
    calculationWeightKg: 60,
  },
};

function renderProfile(saveProfile = vi.fn().mockResolvedValue(storedProfile)) {
  const page = (
    <ToastProvider>
      <ProfileContext.Provider
        value={{
          status: 'ready',
          profile: storedProfile,
          errorMessage: undefined,
          saveProfile,
          clearProfile: vi.fn(),
          refreshProfile: vi.fn(),
        }}
      >
        <ProfilePage />
      </ProfileContext.Provider>
    </ToastProvider>
  );

  return {
    saveProfile,
    ...render(
      <RouterProvider
        router={createMemoryRouter(
          [{ path: '/profile', element: page }],
          { initialEntries: ['/profile'] },
        )}
      />,
    ),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.previewProfileImpact.mockReset();
  mocks.previewProfileImpact.mockResolvedValue(impactPreview);
  mocks.recalculateTarget.mockReset();
  mocks.recalculateTarget.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ProfilePage', () => {
  it('affiche une action crayon compacte puis revient en lecture seule après sauvegarde', async () => {
    const user = userEvent.setup();
    const { saveProfile } = renderProfile();

    const editButton = screen.getByRole('button', { name: 'Modifier le profil' });
    expect(editButton).toHaveAttribute('title', 'Modifier le profil');
    expect(editButton).toHaveClass('size-11', 'p-0');
    expect(editButton).not.toHaveTextContent('Modifier le profil');
    expect(editButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByLabelText('Prénom')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer le profil' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument();

    await user.click(editButton);
    const firstNameInput = screen.getByLabelText('Prénom');
    await waitFor(() => expect(firstNameInput).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Enregistrer le profil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();

    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Axel mobile');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));

    expect(saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Axel mobile' }),
    );
    expect(mocks.previewProfileImpact).not.toHaveBeenCalled();
    expect(await screen.findByText('Profil mis à jour')).toBeInTheDocument();
    expect(screen.getAllByText('Profil mis à jour')).toHaveLength(1);
    expect(screen.queryByLabelText('Prénom')).not.toBeInTheDocument();
    expect(screen.queryByText('Le profil a été mis à jour dans la base locale.')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier le profil' })).toHaveFocus());
  });

  it('active le mode édition au clavier et place le focus dans le formulaire', async () => {
    const user = userEvent.setup();
    renderProfile();

    const editButton = screen.getByRole('button', { name: 'Modifier le profil' });
    editButton.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByLabelText('Prénom')).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Enregistrer le profil' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeVisible();
  });

  it('bloque une double soumission et n’affiche qu’un toast de réussite', async () => {
    let resolveSave: ((profile: typeof storedProfile) => void) | undefined;
    const saveProfile = vi.fn(() => new Promise<typeof storedProfile>((resolve) => {
      resolveSave = resolve;
    }));
    const user = userEvent.setup();
    renderProfile(saveProfile);

    await user.click(screen.getByRole('button', { name: 'Modifier le profil' }));
    const firstNameInput = screen.getByLabelText('Prénom');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Axel unique');
    const saveButton = screen.getByRole('button', { name: 'Enregistrer le profil' });
    await user.click(saveButton);
    await user.click(saveButton);

    expect(saveProfile).toHaveBeenCalledOnce();
    expect(saveButton).toBeDisabled();
    await act(async () => {
      resolveSave?.(storedProfile);
      await Promise.resolve();
    });

    expect(await screen.findByText('Profil mis à jour')).toBeInTheDocument();
    expect(screen.getAllByText('Profil mis à jour')).toHaveLength(1);
  });

  it('conserve une erreur locale actionnable et aucun succès lorsque la sauvegarde échoue', async () => {
    const saveProfile = vi.fn().mockRejectedValue(new Error('Stockage local indisponible.'));
    const user = userEvent.setup();
    renderProfile(saveProfile);

    await user.click(screen.getByRole('button', { name: 'Modifier le profil' }));
    const firstNameInput = screen.getByLabelText('Prénom');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Axel erreur');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));

    expect(await screen.findByText('Stockage local indisponible.')).toBeInTheDocument();
    expect(screen.getByText('Enregistrement impossible')).toBeInTheDocument();
    expect(screen.queryByText('Profil mis à jour')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
  });

  it('retire automatiquement le toast de succès sans notice verte persistante', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Modifier le profil' }));
    const firstNameInput = screen.getByLabelText('Prénom');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Axel toast');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));

    expect(await screen.findByText('Profil mis à jour')).toBeInTheDocument();
    expect(screen.queryByText('Action prise en compte')).not.toBeInTheDocument();
    await waitFor(
      () => expect(screen.queryByText('Profil mis à jour')).not.toBeInTheDocument(),
      { timeout: 4500 },
    );
  }, 6000);

  it('affiche un avant/après puis exige une confirmation pour un objectif', async () => {
    const user = userEvent.setup();
    const savedProfile = { ...storedProfile, goal: 'loss' as const, targetWeeklyWeightChangePercent: -0.5 };
    const saveProfile = vi.fn().mockResolvedValue(savedProfile);
    renderProfile(saveProfile);

    await user.click(screen.getByRole('button', { name: 'Modifier le profil' }));
    const goalSelect = document.querySelector('#goal');
    expect(goalSelect).toBeInstanceOf(HTMLSelectElement);
    fireEvent.change(goalSelect as HTMLSelectElement, { target: { value: 'loss' } });
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));

    expect(await screen.findByRole('heading', { name: 'Vérifier l’impact avant d’enregistrer' })).toBeInTheDocument();
    expect(saveProfile).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirmer les changements' }));

    expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({
      goal: 'loss',
      targetWeeklyWeightChangePercent: -0.5,
      profileImpactHistory: expect.arrayContaining([
        expect.objectContaining({
          beforeTargetCaloriesKcal: 2400,
          afterTargetCaloriesKcal: 2180,
        }),
      ]),
    }));
    expect(mocks.recalculateTarget).toHaveBeenCalledWith('2026-07-10', savedProfile);
    expect(await screen.findByText('Profil mis à jour')).toBeInTheDocument();
    expect(screen.queryByLabelText('Objectif')).not.toBeInTheDocument();
  });

  it('distingue un échec de recalcul après un profil déjà enregistré', async () => {
    const user = userEvent.setup();
    const savedProfile = { ...storedProfile, goal: 'loss' as const, targetWeeklyWeightChangePercent: -0.5 };
    const saveProfile = vi.fn().mockResolvedValue(savedProfile);
    mocks.recalculateTarget.mockRejectedValueOnce(new Error('recalcul indisponible'));
    renderProfile(saveProfile);

    await user.click(screen.getByRole('button', { name: 'Modifier le profil' }));
    const goalSelect = document.querySelector('#goal');
    expect(goalSelect).toBeInstanceOf(HTMLSelectElement);
    fireEvent.change(goalSelect as HTMLSelectElement, { target: { value: 'loss' } });
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmer les changements' }));

    expect(saveProfile).toHaveBeenCalledOnce();
    expect(await screen.findByText('Profil enregistré, recalcul à relancer')).toBeInTheDocument();
    expect(screen.getByText(/Le profil et le journal ont été enregistrés localement/)).toBeInTheDocument();
    expect(screen.queryByText('Profil mis à jour')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Objectif')).not.toBeInTheDocument();
  });

  it('demande confirmation avant d’abandonner des changements et restaure le focus', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Modifier le profil' }));
    const firstNameInput = screen.getByLabelText('Prénom');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Modification non enregistrée');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.getByRole('alertdialog', { name: 'Annuler les modifications ?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer la modification' }));
    expect(screen.getByLabelText('Prénom')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    await user.click(screen.getByRole('button', { name: 'Abandonner les modifications' }));
    expect(screen.queryByLabelText('Prénom')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier le profil' })).toHaveFocus());
  });

  it('annule sans confirmation en l’absence de modification', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Modifier le profil' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByLabelText('Prénom')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier le profil' })).toHaveFocus());
  });

  it('limite le contenu et le formulaire pour éviter le débordement horizontal', async () => {
    const user = userEvent.setup();
    const { container } = renderProfile();

    expect(container.querySelector('section')).toHaveClass('min-w-0', 'overflow-x-clip');
    expect(screen.getByText(/59,8 kg/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Modifier le profil' }));
    expect(screen.getByLabelText(/Taille en centimètres/)).toHaveClass('max-w-full');
  });
});
