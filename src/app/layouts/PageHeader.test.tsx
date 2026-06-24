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
});
