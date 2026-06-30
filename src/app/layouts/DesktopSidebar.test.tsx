import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DesktopSidebar } from '@/app/layouts/DesktopSidebar';

function renderSidebar() {
  return render(
    <MemoryRouter>
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
    expect(scrollRegion).toContainElement(
      screen.getByRole('navigation', { name: 'Navigation secondaire' }),
    );
  });
});
