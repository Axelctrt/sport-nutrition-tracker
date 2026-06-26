import { cleanup, render, screen, within } from '@testing-library/react';
import { OpenFoodFactsSearchSummary } from '@/features/open-food-facts/components/OpenFoodFactsSearchSummary';

afterEach(cleanup);

describe('OpenFoodFactsSearchSummary', () => {
  it('regroupe les résultats locaux, affichés et disponibles dans la base', () => {
    render(<OpenFoodFactsSearchSummary localCount={2} remoteCount={12} totalCount={1345} />);

    const summary = screen.getByLabelText('Résumé de la recherche');
    expect(within(summary).getByText('2')).toBeInTheDocument();
    expect(within(summary).getByText('12')).toBeInTheDocument();
    expect(within(summary).getByText((content) => content.replace(/\s/g, '') === '1345')).toBeInTheDocument();
  });
});
