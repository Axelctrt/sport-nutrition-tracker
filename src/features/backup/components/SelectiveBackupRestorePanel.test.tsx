import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

import {
  ProfileContext,
  type ProfileContextValue,
} from '@/app/providers/profile/ProfileContext';
import {
  ThemeContext,
  type ThemeContextValue,
} from '@/app/providers/theme';
import { SelectiveBackupRestorePanel } from '@/features/backup/components/SelectiveBackupRestorePanel';
import type {
  PreparedSelectiveBackupRestore,
  SelectiveBackupRestoreResult,
} from '@/infrastructure/backup/selectiveBackupRestoreService';

const refreshProfile = vi.fn(async () => undefined);
const clearProfile = vi.fn(async () => undefined);
const saveProfile = vi.fn(async () => {
  throw new Error('saveProfile ne doit pas être appelé par ce test.');
});
const setTheme = vi.fn();

function renderPanel(element: ReactElement) {
  const profileValue: ProfileContextValue = {
    status: 'ready',
    profile: undefined,
    errorMessage: undefined,
    saveProfile,
    clearProfile,
    refreshProfile,
  };

  const themeValue: ThemeContextValue = {
    theme: 'system',
    resolvedTheme: 'light',
    setTheme,
  };

  return render(
    <ThemeContext.Provider value={themeValue}>
      <ProfileContext.Provider value={profileValue}>
        {element}
      </ProfileContext.Provider>
    </ThemeContext.Provider>,
  );
}
function prepared(): PreparedSelectiveBackupRestore {
  return {
    envelope: {
      format: 'sportpilot-backup',
      schemaVersion: 3,
      exportedAt: '2026-06-28T16:00:00.000Z',
      appVersion: '0.16.0',
      data: {
        userProfile: [],
        appSettings: [],
        weights: [],
        dailySteps: [],
        activities: [],
        foodProducts: [],
        meals: [],
        foodEntries: [],
        favoriteMeals: [],
        recipes: [],
        recipeIngredients: [],
        dailyTargets: [],
        dailyJournalStatuses: [],
        weeklyReviews: [],
        acceptedCalorieAdjustments: [],
        exerciseDefinitions: [],
        workoutTemplates: [],
        workoutTemplateExercises: [],
        workoutSessions: [],
        workoutSessionExercises: [],
        strengthSets: [],
        progressionSuggestions: [],
      },
    },
    summary: {
      hasProfile: false,
      profileCount: 0,
      totalRecords: 12,
      weights: 2,
      dailySteps: 3,
      activities: 7,
      foodProducts: 0,
      foodEntries: 0,
      recipes: 0,
      favoriteMeals: 0,
      weeklyReviews: 0,
      workoutSessions: 0,
      strengthSets: 0,
      exportedAt: '2026-06-28T16:00:00.000Z',
      schemaVersion: 3,
      sourceSchemaVersion: 3,
      requiresMigration: false,
      compatibility: 'compatible',
      appVersion: '0.16.0',
    },
    categories: [
      {
        key: 'bodyTracking',
        label: 'Poids et pas',
        description: 'Historique corporel.',
        currentRecords: 4,
        incomingRecords: 5,
        available: true,
      },
      {
        key: 'activities',
        label: 'Activités d’endurance',
        description: 'Activités.',
        currentRecords: 3,
        incomingRecords: 7,
        available: true,
      },
      {
        key: 'rewards',
        label: 'Récompenses et thèmes',
        description: 'Récompenses.',
        currentRecords: 1,
        incomingRecords: 0,
        available: false,
      },
    ],
  };
}

describe('SelectiveBackupRestorePanel', () => {
  beforeEach(() => {
    refreshProfile.mockReset();
    setTheme.mockReset();
  });

  it('compare le fichier et affiche les compteurs', async () => {
    const user = userEvent.setup();

    renderPanel(
      <SelectiveBackupRestorePanel
        prepareRestore={() => Promise.resolve(prepared())}
      />,
    );

    const file = new File(
      ['{}'],
      'sportpilot-backup.json',
      {
        type: 'application/json',
      },
    );

    await user.upload(
      screen.getByLabelText(
        'Sauvegarde JSON à comparer',
      ),
      file,
    );

    expect(
      await screen.findByText('Comparaison terminée'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Poids et pas'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Non présent dans cette ancienne sauvegarde',
      ),
    ).toBeInTheDocument();
  });

  it('sauvegarde avant de restaurer les domaines sélectionnés', async () => {
    const user = userEvent.setup();
    const createSafetyBackup = vi
      .fn()
      .mockResolvedValue(undefined);
    const result: SelectiveBackupRestoreResult = {
      selectedCategories: [
        'bodyTracking',
        'activities',
      ],
      restoredRecordCount: 12,
    };
    const applyRestore = vi
      .fn()
      .mockResolvedValue(result);

    renderPanel(
      <SelectiveBackupRestorePanel
        prepareRestore={() => Promise.resolve(prepared())}
        createSafetyBackup={createSafetyBackup}
        applyRestore={applyRestore}
      />,
    );

    await user.upload(
      screen.getByLabelText(
        'Sauvegarde JSON à comparer',
      ),
      new File(['{}'], 'backup.json', {
        type: 'application/json',
      }),
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Restaurer les domaines sélectionnés',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Sauvegarder et restaurer',
      }),
    );

    expect(
      await screen.findByText(
        'Restauration sélective terminée',
      ),
    ).toBeInTheDocument();

    expect(createSafetyBackup).toHaveBeenCalledTimes(1);
    expect(applyRestore).toHaveBeenCalledWith(
      expect.any(Object),
      ['bodyTracking', 'activities'],
    );
    expect(
      createSafetyBackup.mock.invocationCallOrder[0],
    ).toBeLessThan(
      applyRestore.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('permet de tout désélectionner', async () => {
    const user = userEvent.setup();

    renderPanel(
      <SelectiveBackupRestorePanel
        prepareRestore={() => Promise.resolve(prepared())}
      />,
    );

    await user.upload(
      screen.getByLabelText(
        'Sauvegarde JSON à comparer',
      ),
      new File(['{}'], 'backup.json', {
        type: 'application/json',
      }),
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Tout désélectionner',
      }),
    );

    expect(
      screen.getByRole('button', {
        name: 'Restaurer les domaines sélectionnés',
      }),
    ).toBeDisabled();
  });
});
