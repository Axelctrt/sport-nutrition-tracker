import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { SportStartSheet } from '@/features/sport/components/SportStartSheet';
import { createActivityJournalReturnState } from '@/features/activities/navigation/activityJournalNavigation';

describe('SportStartSheet', () => {
  it('respecte l’ordre des activités fréquentes et conserve la date', () => {
    render(
      <MemoryRouter>
        <SportStartSheet
          open
          date="2026-07-10"
          activityTypeOrder={[
            'walking',
            'running',
            'strengthTraining',
            'cycling',
            'swimming',
            'otherCardio',
          ]}
          navigationState={createActivityJournalReturnState('/activities', 'key', '2026-07-10')}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAccessibleName(/Marche/);
    expect(links[0]).toHaveAttribute('href', '/activities/add/other?date=2026-07-10&type=walking');
    expect(links[1]).toHaveAccessibleName(/Course/);
    expect(screen.getByRole('link', { name: /Musculation détaillée/ })).toHaveAttribute(
      'href',
      '/strength/sessions',
    );
    expect(screen.getByRole('link', { name: /Ajouter une activité simple/ })).toHaveAttribute(
      'href',
      '/activities/add/strength?date=2026-07-10',
    );
  });

  it('ferme le panneau lorsqu’une méthode est choisie', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <SportStartSheet
          open
          date="2026-07-10"
          activityTypeOrder={[
            'running',
            'strengthTraining',
            'walking',
            'cycling',
            'swimming',
            'otherCardio',
          ]}
          navigationState={createActivityJournalReturnState('/activities', 'key', '2026-07-10')}
          onClose={onClose}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('link', { name: /Course/ }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
