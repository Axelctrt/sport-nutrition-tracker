import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileBottomNavigation } from '@/app/layouts/MobileBottomNavigation';

function renderNavigation(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <MobileBottomNavigation />
    </MemoryRouter>,
  );
}

describe('MobileBottomNavigation', () => {
  it('expose exactement les quatre rubriques principales', () => {
    renderNavigation('/');
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Accueil',
      'Nutrition',
      'Sport',
      'Progression',
    ]);
  });

  it('déplace l’indicateur jusqu’à la rubrique active', () => {
    const { container, unmount } = renderNavigation('/');
    expect(container.querySelector('.sp-mobile-navigation-indicator'))
      .toHaveStyle({ transform: 'translateX(0%)' });
    unmount();

    const progression = renderNavigation('/analytics');
    expect(progression.container.querySelector('.sp-mobile-navigation-indicator'))
      .toHaveStyle({ transform: 'translateX(300%)' });
  });

  it('garde Progression active sur les anciennes routes de suivi', () => {
    renderNavigation('/weight');
    expect(screen.getByRole('link', { name: 'Progression' })).toHaveAttribute('aria-current', 'page');
  });

  it('garde Progression active dans le centre de récompenses', () => {
    renderNavigation('/rewards');
    expect(screen.getByRole('link', { name: 'Progression' })).toHaveAttribute('aria-current', 'page');
  });

  it('garde Sport actif dans les parcours de musculation', () => {
    renderNavigation('/strength/sessions');
    expect(screen.getByRole('link', { name: 'Sport' })).toHaveAttribute('aria-current', 'page');
  });
});
