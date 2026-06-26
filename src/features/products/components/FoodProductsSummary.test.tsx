import { render, screen } from '@testing-library/react';
import { FoodProductsSummary } from '@/features/products/components/FoodProductsSummary';

describe('FoodProductsSummary', () => {
  it('regroupe les indicateurs de la bibliothèque locale', () => {
    render(<FoodProductsSummary totalCount={12} favoriteCount={4} openFoodFactsCount={5} incompleteCount={2} />);

    expect(screen.getByLabelText('Résumé des aliments locaux')).toHaveTextContent('12 aliments');
    expect(screen.getByLabelText('Favoris : 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Open Food Facts : 5')).toBeInTheDocument();
    expect(screen.getByLabelText('À vérifier : 2')).toBeInTheDocument();
  });
});
