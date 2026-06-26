import { lazy } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { RouteSuspense } from '@/app/LazyRoutePages';

const PendingPage = lazy(() => new Promise<never>(() => undefined));

afterEach(cleanup);

describe('RouteSuspense', () => {
  it('affiche un skeleton structurel pendant le chargement paresseux', () => {
    render(
      <RouteSuspense variant="form">
        <PendingPage />
      </RouteSuspense>,
    );

    expect(screen.getByRole('status', { name: 'Chargement de la page' })).toBeInTheDocument();
  });
});
