import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { StrengthExerciseEditorPage } from '@/features/strength-exercises/pages/StrengthExerciseEditorPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';

describe('StrengthExerciseEditorPage', () => {
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

  it('crée un exercice personnel depuis le formulaire', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/strength/exercises/new']}>
        <Routes>
          <Route path="/strength/exercises/new" element={<StrengthExerciseEditorPage />} />
          <Route path="/strength/exercises" element={<h1>Catalogue chargé</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/Nom de l’exercice/), 'Presse convergente');
    await user.selectOptions(screen.getByLabelText(/Groupe musculaire principal/), 'pectorals');
    await user.selectOptions(screen.getByLabelText(/Matériel/), 'machine');
    await user.click(screen.getByRole('button', { name: 'Créer l’exercice' }));

    expect(await screen.findByRole('heading', { name: 'Catalogue chargé' })).toBeInTheDocument();
    await waitFor(async () => {
      const customExercises = await appDatabase.exerciseDefinitions.where('source').equals('user').toArray();
      expect(customExercises).toEqual([
        expect.objectContaining({ name: 'Presse convergente', equipment: 'machine' }),
      ]);
    });
  });

  it('préremplit le nom puis revient au contexte de séance avec le nouvel identifiant', async () => {
    const user = userEvent.setup();
    function SessionReceiver() {
      const location = useLocation();
      const state = location.state as {
        strengthExerciseCreated?: { exerciseId?: string };
      } | null;
      return (
        <p>
          Retour séance {state?.strengthExerciseCreated?.exerciseId ?? 'absent'}
        </p>
      );
    }
    render(
      <MemoryRouter initialEntries={[
        '/strength/exercises/new?returnTo=session&query=tirage+unilat%C3%A9ral+poulie&sessionId=session-1&plannedSets=3',
      ]}>
        <Routes>
          <Route path="/strength/exercises/new" element={<StrengthExerciseEditorPage />} />
          <Route path="/strength/sessions/:sessionId" element={<SessionReceiver />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/Nom de l’exercice/))
      .toHaveValue('tirage unilatéral poulie');
    expect(screen.getByLabelText(/Groupe musculaire principal/))
      .toHaveValue('other');
    await user.click(screen.getByRole('button', { name: 'Créer l’exercice' }));

    expect(await screen.findByText(/Retour séance (?!absent)/))
      .toBeInTheDocument();
  });
});
