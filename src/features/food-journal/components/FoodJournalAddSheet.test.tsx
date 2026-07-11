import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { selectFoodPath } from '@/app/routePaths';
import { FoodJournalAddSheet } from '@/features/food-journal/components/FoodJournalAddSheet';

const navigationStates = new Map();

describe('FoodJournalAddSheet', () => {
  it('propose les quatre repas avec les routes existantes', () => {
    render(
      <MemoryRouter>
        <FoodJournalAddSheet
          open
          date="2026-07-10"
          navigationStates={navigationStates}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    for (const [label, slot] of [
      ['Petit-déjeuner', 'breakfast'],
      ['Déjeuner', 'lunch'],
      ['Dîner', 'dinner'],
      ['Collations', 'snacks'],
    ] as const) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toHaveAttribute(
        'href',
        selectFoodPath('2026-07-10', slot),
      );
    }
  });
});
