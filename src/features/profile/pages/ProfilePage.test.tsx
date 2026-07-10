import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileContext } from '@/app/providers/profile/ProfileContext';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { createProfileInput } from '@/test/factories/profileFactory';

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

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.previewProfileImpact.mockResolvedValue(impactPreview);
  mocks.recalculateTarget.mockResolvedValue(undefined);
});

describe('ProfilePage', () => {
  it('permet de modifier et enregistrer un champ sans impact énergétique', async () => {
    const user = userEvent.setup();
    const saveProfile = vi.fn().mockResolvedValue(storedProfile);

    render(
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
      </ProfileContext.Provider>,
    );

    const firstNameInput = screen.getByLabelText('Prénom');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Axel mobile');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));

    expect(saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Axel mobile' }),
    );
    expect(mocks.previewProfileImpact).not.toHaveBeenCalled();
    expect(await screen.findByText('Le profil a été mis à jour dans la base locale.')).toBeInTheDocument();
  });

  it('affiche un avant/après puis exige une confirmation pour un objectif', async () => {
    const user = userEvent.setup();
    const savedProfile = { ...storedProfile, goal: 'loss' as const, targetWeeklyWeightChangePercent: -0.5 };
    const saveProfile = vi.fn().mockResolvedValue(savedProfile);

    render(
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
      </ProfileContext.Provider>,
    );

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
    expect(await screen.findByText(/Les objectifs de la journée ont été recalculés/)).toBeInTheDocument();
  });

  it('distingue un échec de recalcul après un profil déjà enregistré', async () => {
    const user = userEvent.setup();
    const savedProfile = { ...storedProfile, goal: 'loss' as const, targetWeeklyWeightChangePercent: -0.5 };
    const saveProfile = vi.fn().mockResolvedValue(savedProfile);
    mocks.recalculateTarget.mockRejectedValueOnce(new Error('recalcul indisponible'));

    render(
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
      </ProfileContext.Provider>,
    );

    const goalSelect = document.querySelector('#goal');
    expect(goalSelect).toBeInstanceOf(HTMLSelectElement);
    fireEvent.change(goalSelect as HTMLSelectElement, { target: { value: 'loss' } });
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmer les changements' }));

    expect(saveProfile).toHaveBeenCalledOnce();
    expect(await screen.findByText(/Le profil et le journal ont été enregistrés/)).toBeInTheDocument();
    expect(screen.queryByText('Le profil n’a pas pu être mis à jour.')).not.toBeInTheDocument();
  });

  it('limite le contenu et la carte pour éviter le débordement horizontal', () => {
    const { container } = render(
      <ProfileContext.Provider
        value={{
          status: 'ready',
          profile: storedProfile,
          errorMessage: undefined,
          saveProfile: vi.fn(),
          clearProfile: vi.fn(),
          refreshProfile: vi.fn(),
        }}
      >
        <ProfilePage />
      </ProfileContext.Provider>,
    );

    expect(container.querySelector('section')).toHaveClass('min-w-0', 'overflow-x-clip');
    expect(screen.getByLabelText(/Taille en centimètres/)).toHaveClass('max-w-full');
    expect(screen.getByText(/59,8 kg/)).toBeInTheDocument();
  });
});
