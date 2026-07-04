import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DesktopSidebar } from '@/app/layouts/DesktopSidebar';

function renderSidebar(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DesktopSidebar />
    </MemoryRouter>,
  );
}

describe('DesktopSidebar', () => {
  it('conserve les paramètres accessibles dans une zone de navigation défilante', () => {
    const { container } = renderSidebar();

    expect(screen.getByRole('link', { name: 'Paramètres' })).toHaveAttribute(
      'href',
      '/settings',
    );

    const scrollRegion = container.querySelector('.overflow-y-auto');
    expect(scrollRegion).toHaveClass(
      'min-h-0',
      'flex-1',
      'overscroll-contain',
    );
    const secondaryNavigation = screen.getByRole('navigation', {
      name: 'Navigation secondaire',
    });

    expect(scrollRegion).toContainElement(secondaryNavigation);
    expect(secondaryNavigation).toHaveClass('mt-5');
    expect(secondaryNavigation).not.toHaveClass('mt-auto');
  });

  it('ne sélectionne que Rappels sur sa route dédiée', () => {
    renderSidebar('/settings/reminders');

    expect(screen.getByRole('link', { name: 'Rappels' })).toHaveClass(
      'bg-brand-100',
    );
    expect(screen.getByRole('link', { name: 'Paramètres' })).not.toHaveClass(
      'bg-brand-100',
    );
  });

  it('ne sélectionne que Corbeille sur sa route dédiée', () => {
    renderSidebar('/backup/trash');

    expect(screen.getByRole('link', { name: 'Corbeille' })).toHaveClass(
      'bg-brand-100',
    );
    expect(screen.getByRole('link', { name: 'Sauvegarde' })).not.toHaveClass(
      'bg-brand-100',
    );
  });

});
