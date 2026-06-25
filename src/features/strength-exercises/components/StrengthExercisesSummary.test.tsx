import { render, screen } from '@testing-library/react';
import { StrengthExercisesSummary } from '@/features/strength-exercises/components/StrengthExercisesSummary';
import { createStrengthExercise } from '@/test/factories/strengthUxFactory';

describe('StrengthExercisesSummary', () => {
  it('regroupe les volumes du catalogue affiché', () => {
    render(
      <StrengthExercisesSummary
        exercises={[
          createStrengthExercise(),
          createStrengthExercise({ id: 'exercise-2', source: 'catalog' }),
          createStrengthExercise({ id: 'exercise-3', isArchived: true }),
        ]}
      />,
    );

    expect(screen.getByLabelText('Affichés : 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Catalogue : 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Personnels : 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Archivés : 1')).toBeInTheDocument();
  });
});
