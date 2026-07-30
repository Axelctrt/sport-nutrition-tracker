import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkoutTemplateForm } from '@/features/strength-templates/components/WorkoutTemplateForm';
import { defaultWorkoutTemplateFormValues } from '@/features/strength-templates/utils/workoutTemplateForm';
import type { WorkoutTemplateFormValues } from '@/features/strength-templates/schemas/workoutTemplateSchema';
import { createExerciseDefinitionInput } from '@/test/factories/strengthFactory';
import { createEntity } from '@/shared/utils/entities';

const definitions = [
  createEntity(createExerciseDefinitionInput({
    name: 'Développé couché',
    trackingMode: 'loadRepetitions',
  }), 'exercise-load'),
  createEntity(createExerciseDefinitionInput({
    name: 'Gainage',
    loadUnit: 'none',
    trackingMode: 'duration',
  }), 'exercise-duration'),
  createEntity(createExerciseDefinitionInput({
    name: 'Marche du fermier',
    loadUnit: 'none',
    trackingMode: 'distance',
  }), 'exercise-distance'),
];

function createSubmitMock() {
  return vi.fn(async (_values: WorkoutTemplateFormValues): Promise<void> => undefined);
}

function renderForm(onSubmit = createSubmitMock()) {
  render(
    <WorkoutTemplateForm
      initialValues={defaultWorkoutTemplateFormValues}
      exerciseDefinitions={definitions}
      submitLabel="Créer la séance"
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

async function addExercise(name: string) {
  const user = userEvent.setup();
  const search = screen.getByRole('searchbox', {
    name: 'Rechercher un exercice à ajouter au modèle',
  });
  await user.type(search, name);
  await user.click(screen.getByRole('button', { name: `Ajouter ${name}` }));
}

describe('WorkoutTemplateForm', () => {
  it('ajoute directement depuis la recherche et ne développe qu’une carte à la fois', async () => {
    const user = userEvent.setup();
    renderForm();

    await addExercise('Développé couché');
    await addExercise('Gainage');
    await addExercise('Marche du fermier');

    const loadToggle = screen.getByRole('button', { name: 'Développer Développé couché' });
    const durationToggle = screen.getByRole('button', { name: 'Développer Gainage' });
    const distanceToggle = screen.getByRole('button', { name: 'Réduire Marche du fermier' });
    expect(loadToggle).toHaveAttribute('aria-expanded', 'false');
    expect(durationToggle).toHaveAttribute('aria-expanded', 'false');
    expect(distanceToggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(loadToggle);
    expect(loadToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Développer Marche du fermier' }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Charge cible (kg)')).toBeVisible();
    expect(screen.getByLabelText('Repos principal (secondes)')).toBeVisible();

    const advanced = screen.getByText('Réglages avancés').closest('details')!;
    expect(advanced).not.toHaveAttribute('open');
    await user.click(within(advanced).getByText('Réglages avancés'));
    expect(within(advanced).getByLabelText(/Incrément \(kg\)/)).toBeVisible();
    expect(within(advanced).getByLabelText('RPE maximal recommandé')).toBeVisible();

    await user.click(loadToggle);
    expect(screen.getByRole('button', { name: 'Développer Développé couché' }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Charge cible (kg)')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Développer Gainage' }));
    expect(screen.getByLabelText('Durée cible (secondes)')).toBeVisible();
    expect(screen.queryByLabelText('Répétitions min.')).not.toBeInTheDocument();
  });

  it('réorganise et supprime les exercices depuis leurs cartes compactes', async () => {
    const user = userEvent.setup();
    renderForm();
    await addExercise('Développé couché');
    await addExercise('Gainage');

    await user.click(screen.getByRole('button', { name: 'Monter l’exercice 2' }));
    const cardToggles = screen.getAllByRole('button', { name: /^(Développer|Réduire) / });
    expect(cardToggles[0]).toHaveAccessibleName(/Gainage/);

    await user.click(screen.getByRole('button', { name: 'Supprimer l’exercice 1' }));
    expect(screen.queryByRole('button', { name: /Gainage/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Développé couché/ })).toBeInTheDocument();
  });

  it('crée et modifie un tri-set global puis conserve ses réglages à la sauvegarde', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();
    await user.type(screen.getByLabelText(/Nom de la séance/), 'Tri-set A');
    for (const definition of definitions) await addExercise(definition.name);

    await user.click(screen.getByText('Organiser en superset ou circuit'));
    const organization = screen.getByText('Organiser en superset ou circuit').closest('details')!;
    for (const definition of definitions) {
      await user.click(within(organization).getByRole('checkbox', { name: definition.name }));
    }
    await user.selectOptions(
      within(organization).getByLabelText('Type du nouveau groupe'),
      'triSet',
    );
    await user.click(within(organization).getByRole('button', { name: 'Créer le groupe' }));

    await user.type(within(organization).getByLabelText('Nom facultatif'), 'Tour complet');
    await user.clear(within(organization).getByLabelText('Nombre de tours'));
    await user.type(within(organization).getByLabelText('Nombre de tours'), '4');
    await user.click(screen.getByRole('button', { name: 'Créer la séance' }));

    expect(onSubmit).toHaveBeenCalledOnce();
    const values = onSubmit.mock.calls[0]![0];
    expect(values.exercises).toHaveLength(3);
    expect(values.exercises.every((exercise) => exercise.exerciseGroupType === 'triSet')).toBe(true);
    expect(values.exercises.every((exercise) => exercise.exerciseGroupName === 'Tour complet')).toBe(true);
    expect(values.exercises.every((exercise) => exercise.exerciseGroupRounds === 4)).toBe(true);
  });

  it('duplique et dissout un groupe depuis sa synthèse unique', async () => {
    const user = userEvent.setup();
    renderForm();
    await addExercise('Développé couché');
    await addExercise('Gainage');

    await user.click(screen.getByText('Organiser en superset ou circuit'));
    const organization = screen.getByText('Organiser en superset ou circuit').closest('details')!;
    await user.click(within(organization).getByRole('checkbox', { name: 'Développé couché' }));
    await user.click(within(organization).getByRole('checkbox', { name: 'Gainage' }));
    await user.click(within(organization).getByRole('button', { name: 'Créer le groupe' }));
    await user.click(within(organization).getByRole('button', { name: 'Dupliquer' }));

    expect(within(organization).getAllByRole('button', { name: 'Dissoudre' })).toHaveLength(2);
    await user.click(within(organization).getAllByRole('button', { name: 'Dissoudre' })[0]!);
    expect(within(organization).getAllByRole('button', { name: 'Dissoudre' })).toHaveLength(1);
  });
});
