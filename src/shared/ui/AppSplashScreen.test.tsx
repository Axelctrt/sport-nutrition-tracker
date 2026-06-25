import { cleanup, render, screen } from '@testing-library/react';
import { AppSplashScreen } from '@/shared/ui/AppSplashScreen';

afterEach(cleanup);

describe('AppSplashScreen', () => {
  it('affiche l’identité de l’application pendant la préparation', () => {
    render(<AppSplashScreen />);

    const splash = screen.getByRole('status');
    expect(splash).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('SportPilot')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ton suivi se prépare' })).toBeInTheDocument();
  });

  it('désactive les animations lorsque le mouvement est réduit', () => {
    render(<AppSplashScreen />);

    const logo = document.querySelector('img[src="/favicon.svg"]');
    expect(logo).toHaveClass('motion-reduce:animate-none');
  });
});
