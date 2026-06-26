import { render, screen } from '@testing-library/react';
import { WorkoutTemplatesSummary } from '@/features/strength-templates/components/WorkoutTemplatesSummary';
import { createWorkoutTemplateSummary } from '@/test/factories/strengthUxFactory';

describe('WorkoutTemplatesSummary', () => {
  it('résume les modèles et leur contenu', () => {
    render(
      <WorkoutTemplatesSummary
        templates={[
          createWorkoutTemplateSummary(),
          createWorkoutTemplateSummary({
            template: { ...createWorkoutTemplateSummary().template, id: 'template-2', isArchived: true },
            exerciseCount: 3,
          }),
        ]}
      />,
    );

    expect(screen.getByLabelText('Affichés : 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Actifs : 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Archivés : 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Exercices : 8')).toBeInTheDocument();
  });
});
