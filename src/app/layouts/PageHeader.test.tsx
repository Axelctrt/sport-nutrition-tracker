import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from '@/app/layouts/PageHeader';
import { mobileHeaderBackDestination } from '@/app/layouts/mobileHeaderNavigation';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

function renderHeader(pathname: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[pathname]}>
        <PageHeader />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('PageHeader', () => {
  it('place les paramètres à gauche sur une rubrique principale', () => {
    renderHeader('/food');
    const settingsLink = screen.getByRole('link', { name: 'Ouvrir les paramètres' });
    expect(settingsLink).toHaveAttribute('href', '/settings');
    expect(settingsLink).toHaveClass('size-[var(--sp-touch-target)]');
    expect(screen.queryByRole('link', { name: 'Retour' })).not.toBeInTheDocument();
  });

  it('réserve la gauche au retour sur un écran secondaire', () => {
    renderHeader('/food/add');
    expect(screen.getByRole('link', { name: 'Retour' })).toHaveAttribute('href', '/food');
    expect(screen.queryByRole('link', { name: 'Ouvrir les paramètres' })).not.toBeInTheDocument();
  });

  it('ramène les écrans de suivi vers le hub Progression', () => {
    expect(mobileHeaderBackDestination('/weight')).toBe('/progression');
    expect(mobileHeaderBackDestination('/weekly-review')).toBe('/progression');
  });
});
