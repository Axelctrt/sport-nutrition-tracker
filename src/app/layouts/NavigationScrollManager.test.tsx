import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import { NavigationScrollManager } from '@/app/layouts/NavigationScrollManager';
import { clearStoredScrollPositions } from '@/app/layouts/scrollPositionStore';

function TestLayout() {
  return (
    <>
      <NavigationScrollManager />
      <Link to="/detail">Ouvrir le détail</Link>
      <Outlet />
    </>
  );
}

let scrollY = 0;
let scrollToMock = vi.fn();

beforeEach(() => {
  clearStoredScrollPositions();
  scrollY = 0;
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
  scrollToMock = vi.fn((first?: ScrollToOptions | number, second?: number) => {
    scrollY = typeof first === 'number'
      ? Number(second ?? 0)
      : Number(first?.top ?? 0);
  });
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: scrollToMock,
  });
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  };
});

afterEach(cleanup);

describe('NavigationScrollManager', () => {
  it('revient en haut sur une nouvelle page et restaure la position avec Retour', async () => {
    const router = createMemoryRouter([
      {
        element: <TestLayout />,
        children: [
          { path: '/list', element: <h1>Liste</h1> },
          { path: '/detail', element: <h1>Détail</h1> },
        ],
      },
    ], { initialEntries: ['/list'] });

    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Liste' });
    scrollToMock.mockClear();

    scrollY = 420;
    fireEvent.click(screen.getByRole('link', { name: 'Ouvrir le détail' }));
    await screen.findByRole('heading', { name: 'Détail' });
    await waitFor(() => expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' }));

    scrollY = 80;
    await act(() => router.navigate(-1));
    await screen.findByRole('heading', { name: 'Liste' });
    await waitFor(() => expect(scrollToMock).toHaveBeenLastCalledWith({ top: 420, behavior: 'instant' }));
  });

  it('restaure une position explicitement demandée après un formulaire', async () => {
    const router = createMemoryRouter([
      {
        element: <TestLayout />,
        children: [
          { path: '/list', element: <h1>Liste</h1> },
          { path: '/detail', element: <h1>Détail</h1> },
        ],
      },
    ], { initialEntries: ['/list'] });

    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Liste' });
    const listKey = router.state.location.key;
    scrollY = 640;
    await act(() => router.navigate('/detail'));
    await screen.findByRole('heading', { name: 'Détail' });

    scrollToMock.mockClear();
    await act(() => router.navigate('/list', {
      state: { scroll: 'restore', restoreScrollKey: listKey },
    }));

    await waitFor(() => expect(scrollToMock).toHaveBeenLastCalledWith({ top: 640, behavior: 'instant' }));
  });
});
