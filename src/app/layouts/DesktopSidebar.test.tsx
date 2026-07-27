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

  it('conserve une navigation secondaire courte et laisse Paramètres actif sur ses sous-pages', () => {
    renderSidebar('/settings/notifications-routines');

    const secondaryNavigation = screen.getByRole('navigation', {
      name: 'Navigation secondaire',
    });
    expect(secondaryNavigation.querySelectorAll('a')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Paramètres' })).toHaveClass(
      'bg-brand-100',
    );
    expect(screen.queryByRole('link', { name: 'Rappels' })).not.toBeInTheDocument();
  });

});
