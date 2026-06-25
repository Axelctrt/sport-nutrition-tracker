import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from '@/app/layouts/PageHeader';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

function renderHeader(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ThemeProvider>
        <PageHeader />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('PageHeader', () => {

  it('propose un accès direct aux paramètres dans l’en-tête mobile', () => {
    renderHeader();

    const settingsLink = screen.getByRole('link', { name: 'Ouvrir les paramètres' });
    expect(settingsLink).toHaveAttribute('href', '/settings');
    expect(settingsLink).toHaveClass('lg:hidden');
  });

  it('indique la page paramètres comme active', () => {
    renderHeader('/settings');

    expect(screen.getByRole('link', { name: 'Ouvrir les paramètres' })).toHaveClass(
      'bg-brand-100',
    );
  });
  it('propose un accès direct au profil dans l’en-tête mobile', () => {
    renderHeader();

    const profileLink = screen.getByRole('link', { name: 'Modifier le profil' });
    expect(profileLink).toHaveAttribute('href', '/profile');
    expect(profileLink).toHaveClass('lg:hidden');
  });

  it('indique la page profil comme active', () => {
    renderHeader('/profile');

    expect(screen.getByRole('link', { name: 'Modifier le profil' })).toHaveClass(
      'bg-brand-100',
    );
  });

  it('affiche le titre de la page courante dans l’en-tête mobile', () => {
    renderHeader('/strength/sessions/session-1');

    expect(screen.getByText('Séance de musculation')).toBeInTheDocument();
    expect(document.title).toBe('Séance de musculation · SportPilot');
  });

});
