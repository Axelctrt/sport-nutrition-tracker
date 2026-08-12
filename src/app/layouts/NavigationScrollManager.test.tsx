import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import { NavigationScrollManager } from '@/app/layouts/NavigationScrollManager';
import { clearStoredScrollPositions } from '@/app/layouts/scrollPositionStore';

function TestLayout() {
  return (
    <>
      <NavigationScrollManager />
      <Link to="/detail">Ouvrir le détail</Link>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}

function DetailPage() {
  return (
    <>
      <h1>Détail</h1>
      <label htmlFor="detail-input">Saisie rapide</label>
      <input id="detail-input" />
    </>
  );
}

function SecondPage() {
  return (
    <>
      <h1>Seconde page</h1>
      <label htmlFor="second-input">Saisie suivante</label>
      <input id="second-input" />
    </>
  );
}

let scrollY = 0;
let scrollToMock = vi.fn();
let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
let originalCancelAnimationFrame: typeof window.cancelAnimationFrame;
let nextAnimationFrameId = 1;
let animationFrames = new Map<number, FrameRequestCallback>();

async function flushAnimationFrame(): Promise<void> {
  const scheduledFrames = [...animationFrames.values()];
  animationFrames.clear();
  await act(async () => {
    scheduledFrames.forEach((callback) => callback(0));
  });
}

async function flushAfterPaint(): Promise<void> {
  await flushAnimationFrame();
  await flushAnimationFrame();
}

beforeEach(() => {
  originalRequestAnimationFrame = window.requestAnimationFrame;
  originalCancelAnimationFrame = window.cancelAnimationFrame;
  clearStoredScrollPositions();
  scrollY = 0;
  nextAnimationFrameId = 1;
  animationFrames = new Map();
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
  window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    const id = nextAnimationFrameId;
    nextAnimationFrameId += 1;
    animationFrames.set(id, callback);
    return id;
  });
  window.cancelAnimationFrame = vi.fn((id: number) => {
    animationFrames.delete(id);
  });
});

afterEach(() => {
  cleanup();
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

describe('NavigationScrollManager', () => {
  it('revient en haut et focalise le contenu principal sur une navigation PUSH normale', async () => {
    const router = createMemoryRouter([
      {
        element: <TestLayout />,
        children: [
          { path: '/list', element: <h1>Liste</h1> },
          { path: '/detail', element: <DetailPage /> },
        ],
      },
    ], { initialEntries: ['/list'] });

    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Liste' });
    scrollToMock.mockClear();

    scrollY = 420;
    await act(() => router.navigate('/detail'));
    await screen.findByRole('heading', { name: 'Détail' });
    await flushAfterPaint();

    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
    expect(document.getElementById('main-content')).toHaveFocus();
  });

  it('préserve un nouveau focus acquis avant le callback de navigation différé', async () => {
    const router = createMemoryRouter([
      {
        element: <TestLayout />,
        children: [
          { path: '/list', element: <h1>Liste</h1> },
          { path: '/detail', element: <DetailPage /> },
        ],
      },
    ], { initialEntries: ['/list'] });

    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Liste' });
    await act(() => router.navigate('/detail'));
    const input = await screen.findByLabelText('Saisie rapide');

    await flushAnimationFrame();
    input.focus();
    expect(input).toHaveFocus();
    await flushAnimationFrame();

    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
    expect(input).toHaveFocus();
    expect(document.getElementById('main-content')).not.toHaveFocus();
  });

  it('transfère le focus depuis le déclencheur historique encore actif', async () => {
    const router = createMemoryRouter([
      {
        element: <TestLayout />,
        children: [
          { path: '/list', element: <h1>Liste</h1> },
          { path: '/detail', element: <DetailPage /> },
        ],
      },
    ], { initialEntries: ['/list'] });

    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Liste' });
    const trigger = screen.getByRole('link', { name: 'Ouvrir le détail' });
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByRole('heading', { name: 'Détail' });
    expect(trigger).toHaveFocus();
    await flushAfterPaint();

    expect(document.getElementById('main-content')).toHaveFocus();
  });

  it('restaure la position avec Retour sans voler le focus', async () => {
    const router = createMemoryRouter([
      {
        element: <TestLayout />,
        children: [
          { path: '/list', element: <h1>Liste</h1> },
          { path: '/detail', element: <DetailPage /> },
        ],
      },
    ], { initialEntries: ['/list'] });

    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Liste' });
    scrollY = 420;
    await act(() => router.navigate('/detail'));
    await screen.findByRole('heading', { name: 'Détail' });
    await flushAfterPaint();

    scrollY = 80;
    await act(() => router.navigate(-1));
    await screen.findByRole('heading', { name: 'Liste' });
    await flushAfterPaint();

    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 420, behavior: 'instant' });
  });

  it('restaure une position explicitement demandée après un formulaire', async () => {
    const router = createMemoryRouter([
      {
        element: <TestLayout />,
        children: [
          { path: '/list', element: <h1>Liste</h1> },
          { path: '/detail', element: <DetailPage /> },
        ],
      },
    ], { initialEntries: ['/list'] });

    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Liste' });
    const listKey = router.state.location.key;
    scrollY = 640;
    await act(() => router.navigate('/detail'));
    await screen.findByRole('heading', { name: 'Détail' });
    await flushAfterPaint();

    scrollToMock.mockClear();
    await act(() => router.navigate('/list', {
      state: { scroll: 'restore', restoreScrollKey: listKey },
    }));

    await flushAfterPaint();
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 640, behavior: 'instant' });
  });

  it('préserve explicitement le scroll sans programmer de transfert de focus', async () => {
    const router = createMemoryRouter([
      {
        element: <TestLayout />,
        children: [
          { path: '/list', element: <h1>Liste</h1> },
          { path: '/detail', element: <DetailPage /> },
        ],
      },
    ], { initialEntries: ['/list'] });

    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Liste' });
    scrollY = 280;
    scrollToMock.mockClear();

    await act(() => router.navigate('/detail', { state: { scroll: 'preserve' } }));
    await screen.findByRole('heading', { name: 'Détail' });
    await flushAfterPaint();

    expect(scrollY).toBe(280);
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(document.getElementById('main-content')).not.toHaveFocus();
  });

  it('annule le callback obsolète lorsqu’une nouvelle navigation intervient', async () => {
    const router = createMemoryRouter([
      {
        element: <TestLayout />,
        children: [
          { path: '/list', element: <h1>Liste</h1> },
          { path: '/detail', element: <DetailPage /> },
          { path: '/second', element: <SecondPage /> },
        ],
      },
    ], { initialEntries: ['/list'] });

    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Liste' });
    await act(() => router.navigate('/detail'));
    await screen.findByRole('heading', { name: 'Détail' });
    await flushAnimationFrame();

    scrollY = 320;
    scrollToMock.mockClear();
    await act(() => router.navigate('/second', { state: { scroll: 'preserve' } }));
    const input = await screen.findByLabelText('Saisie suivante');
    input.focus();
    await flushAnimationFrame();

    expect(scrollY).toBe(320);
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(input).toHaveFocus();
  });
});
