import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { WorkoutTemplatesPage } from '@/features/strength-templates/pages/WorkoutTemplatesPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { createEntity } from '@/shared/utils/entities';
import { createWorkoutTemplateInput } from '@/test/factories/strengthFactory';

describe('WorkoutTemplatesPage', () => {
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

  it('présente un premier usage orienté vers la création', async () => {
    render(
      <MemoryRouter initialEntries={['/strength/templates']}>
        <WorkoutTemplatesPage />
      </MemoryRouter>,
    );

    const heading = await screen.findByRole('heading', { name: 'Aucune séance modèle' });
    expect(heading.closest('[data-empty-state-variant]')).toHaveAttribute(
      'data-empty-state-variant',
      'first-use',
    );
    expect(screen.getByRole('link', { name: 'Créer une séance' })).toHaveAttribute(
      'href',
      '/strength/templates/new',
    );
  });

  it('efface uniquement la recherche lorsque celle-ci ne renvoie aucun modèle', async () => {
    const user = userEvent.setup();
    await appDatabase.workoutTemplates.add(createEntity(
      createWorkoutTemplateInput({ name: 'Push conservée' }),
      'template-filter-reset',
    ));

    render(
      <MemoryRouter initialEntries={['/strength/templates']}>
        <WorkoutTemplatesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Push conservée' })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', {
      name: 'Rechercher une séance modèle',
    }), 'introuvable');
    const emptyHeading = await screen.findByRole('heading', { name: 'Aucune séance trouvée' });
    expect(emptyHeading.closest('[data-empty-state-variant]')).toHaveAttribute(
      'data-empty-state-variant',
      'filtered',
    );

    await user.click(screen.getByRole('button', { name: 'Effacer la recherche' }));

    expect(await screen.findByRole('heading', { name: 'Push conservée' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', {
      name: 'Rechercher une séance modèle',
    })).toHaveValue('');
    expect(await appDatabase.workoutTemplates.count()).toBe(1);
  });
});
