import { fireEvent, render, screen } from '@testing-library/react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { ToastProvider } from '@/shared/toast/ToastProvider';

describe('AppLayout', () => {
  it('déplace le focus vers le contenu sans modifier la route du HashRouter', async () => {
    window.location.hash = '#/food';
    const router = createHashRouter([
      {
        element: (
          <ThemeProvider>
            <ToastProvider>
              <AppLayout />
            </ToastProvider>
          </ThemeProvider>
        ),
        children: [
          { path: '/food', element: <h1>Journal alimentaire</h1> },
        ],
      },
    ]);

    render(<RouterProvider router={router} />);

    const skipLink = await screen.findByRole('link', { name: 'Aller au contenu' });
    const main = document.querySelector<HTMLElement>('#main-content');
    expect(main).not.toBeNull();

    fireEvent.click(skipLink);

    expect(main).toHaveFocus();
    expect(window.location.hash).toBe('#/food');
    expect(screen.getByRole('heading', { name: 'Journal alimentaire' })).toBeInTheDocument();
  });
});
