import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ProfileContext } from '@/app/providers/profile/ProfileContext';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { ThemeContext } from '@/app/providers/theme';
import { BackupPage } from '@/features/backup/pages/BackupPage';

beforeAll(() => {
  Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeContext.Provider value={{ theme: 'system', resolvedTheme: 'light', setTheme: vi.fn() }}>
        <ProfileContext.Provider
          value={{
            status: 'ready',
            profile: undefined,
            errorMessage: undefined,
            saveProfile: vi.fn(),
            clearProfile: vi.fn(),
            refreshProfile: vi.fn().mockResolvedValue(undefined),
          }}
        >
          <BackupPage />
        </ProfileContext.Provider>
      </ThemeContext.Provider>
    </MemoryRouter>,
  );
}

describe('BackupPage', () => {
  it('priorise les actions principales et replie les informations secondaires', () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'Télécharger la sauvegarde JSON' })).toBeInTheDocument();
    expect(screen.getByLabelText('Fichier JSON SportPilot')).toBeInTheDocument();
    expect(screen.getByText('Confidentialité et stockage').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Fonctionnement de l’application').closest('details')).not.toHaveAttribute('open');
  });

  it('ouvre une confirmation dédiée avant la suppression', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText('Effacer toutes les données'));
    await user.click(screen.getByRole('button', { name: 'Effacer les données locales' }));

    expect(screen.getByRole('alertdialog', { name: 'Effacer toutes les données ?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Effacer définitivement' })).toBeDisabled();
  });

  it('prévisualise le fichier puis demande confirmation avant la restauration', async () => {
    const user = userEvent.setup();
    renderPage();
    const envelope = {
      format: 'sportpilot-backup',
      schemaVersion: 2,
      exportedAt: '2026-06-25T12:00:00.000Z',
      data: {
        userProfile: [],
        appSettings: [createDefaultAppSettings()],
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
    };
    const file = new File([JSON.stringify(envelope)], 'sportpilot-test.json', {
      type: 'application/json',
    });

    await user.upload(screen.getByLabelText('Fichier JSON SportPilot'), file);
    expect(await screen.findByText('Sauvegarde prête à être restaurée')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restaurer cette sauvegarde' }));
    expect(screen.getByRole('alertdialog', { name: 'Remplacer toutes les données ?' })).toBeInTheDocument();
  });

});
