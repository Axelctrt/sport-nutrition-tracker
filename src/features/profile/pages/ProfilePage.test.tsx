import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  return {
    saveProfile,
    ...render(
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
      </ToastProvider>,
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
});

describe('ProfilePage', () => {
  it('affiche le profil en lecture seule puis revient en lecture seule après une sauvegarde réussie', async () => {
    const user = userEvent.setup();
    const { saveProfile } = renderProfile();

    expect(screen.getByRole('button', { name: 'Modifier le profil' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Prénom')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Modifier le profil' }));
    const firstNameInput = screen.getByLabelText('Prénom');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Axel mobile');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));

    expect(saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Axel mobile' }),
    );
    expect(mocks.previewProfileImpact).not.toHaveBeenCalled();
    expect(await screen.findByText('Profil mis à jour')).toBeInTheDocument();
    expect(screen.queryByLabelText('Prénom')).not.toBeInTheDocument();
    expect(screen.queryByText('Le profil a été mis à jour dans la base locale.')).not.toBeInTheDocument();
  });

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

  it('demande confirmation avant d’abandonner des changements', async () => {
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
    expect(screen.getByRole('button', { name: 'Modifier le profil' })).toHaveFocus();
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
