import { cleanup, render, screen } from '@testing-library/react';
import { StickyActionBar } from '@/shared/ui/StickyActionBar';

describe('StickyActionBar', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.style.removeProperty('--mobile-sticky-action-offset');
  });

  it('réserve la place des notifications pendant son affichage', () => {
    const { unmount } = render(<StickyActionBar>Actions</StickyActionBar>);

    expect(screen.getByRole('region', { name: 'Actions de la page' })).toHaveTextContent('Actions');
    expect(document.documentElement.style.getPropertyValue('--mobile-sticky-action-offset')).toBe('5.5rem');

    unmount();
    expect(document.documentElement.style.getPropertyValue('--mobile-sticky-action-offset')).toBe('');
  });

  it('accepte un décalage personnalisé', () => {
    render(<StickyActionBar toastOffset="6rem">Actions</StickyActionBar>);
    expect(document.documentElement.style.getPropertyValue('--mobile-sticky-action-offset')).toBe('6rem');
  });
});
