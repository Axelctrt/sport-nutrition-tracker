import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { useTheme } from '@/app/providers/useTheme';

function ThemeProbe() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div>
      <p>{`${theme}:${resolvedTheme}`}</p>
      <button type="button" onClick={() => setTheme('dark')}>Activer le thème sombre</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  it('reste utilisable lorsque la lecture du stockage local est refusée', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Accès refusé');
    });

    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    expect(screen.getByText('system:light')).toBeInTheDocument();
  });

  it('applique le thème même lorsque sa persistance est refusée', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota dépassé');
    });

    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    await user.click(screen.getByRole('button', { name: 'Activer le thème sombre' }));

    expect(screen.getByText('dark:dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
  });
});
