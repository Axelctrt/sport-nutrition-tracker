import { cleanup, render, screen } from '@testing-library/react';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

afterEach(cleanup);

describe('PageSkeleton', () => {
  it('annonce le chargement sans décalage de structure', () => {
    render(<PageSkeleton variant="workout" />);

    const skeleton = screen.getByRole('status', { name: 'Chargement de la page' });
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveClass('motion-reduce:animate-none');
    expect(skeleton.querySelectorAll('.h-16')).toHaveLength(9);
  });
});
