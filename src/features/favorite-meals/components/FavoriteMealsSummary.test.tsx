import { render, screen } from '@testing-library/react';
import { FavoriteMealsSummary } from '@/features/favorite-meals/components/FavoriteMealsSummary';

describe('FavoriteMealsSummary', () => {
  it('regroupe les indicateurs des favoris', () => {
    render(<FavoriteMealsSummary favoriteCount={3} itemCount={8} averageCalories={420} />);

    expect(screen.getByLabelText('Résumé des repas favoris')).toHaveTextContent('3 favoris');
    expect(screen.getByText('Éléments').parentElement).toHaveTextContent('8');
    expect(screen.getByText('kcal moy.').parentElement).toHaveTextContent('420');
  });
});
