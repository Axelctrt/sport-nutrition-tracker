import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CalculationsInformationPage } from '@/features/information/pages/CalculationsInformationPage';

describe('CalculationsInformationPage', () => {
  it('regroupe les formules dans des sections progressives et documente la musculation', () => {
    render(
      <MemoryRouter>
        <CalculationsInformationPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Musculation et progression')).toBeInTheDocument();
    expect(screen.getByText(/Volume d’une série = charge × répétitions/)).toBeInTheDocument();
    expect(screen.getByText(/1RM estimé selon Epley/)).toBeInTheDocument();
    expect(screen.getByText(/Une hausse de charge est seulement proposée/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ouvrir le profil/ })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('link', { name: /Ouvrir les paramètres/ })).toHaveAttribute(
      'href',
      '/settings',
    );
  });
});
