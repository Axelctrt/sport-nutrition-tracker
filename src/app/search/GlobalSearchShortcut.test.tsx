import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {
  MemoryRouter,
  useLocation,
} from 'react-router-dom';

import { GlobalSearchShortcut } from '@/app/search/GlobalSearchShortcut';

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
}

describe('GlobalSearchShortcut', () => {
  it('ouvre la recherche avec Ctrl + K', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GlobalSearchShortcut />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, {
      key: 'k',
      ctrlKey: true,
    });

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/search',
    );
  });

  it('ignore la touche slash pendant une saisie', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GlobalSearchShortcut />
        <input aria-label="Saisie active" />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.keyDown(
      screen.getByRole('textbox', {
        name: 'Saisie active',
      }),
      {
        key: '/',
      },
    );

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/',
    );
  });
});
