import { render, screen } from '@testing-library/react';
import { RecipesSummary } from '@/features/recipes/components/RecipesSummary';

describe('RecipesSummary', () => {
  it('affiche les indicateurs principaux', () => {
    render(<RecipesSummary recipeCount={4} ingredientCount={12} averageCaloriesPerServing={315} />);

    expect(screen.getByLabelText('Résumé des recettes')).toHaveTextContent('4 recettes');
    expect(screen.getByText('Ingrédients').parentElement).toHaveTextContent('12');
    expect(screen.getByText('kcal moy.').parentElement).toHaveTextContent('315');
  });
});
