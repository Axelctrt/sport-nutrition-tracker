import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ToastProvider } from '@/shared/toast/ToastProvider';
import { useToast } from '@/shared/toast/useToast';

function ToastHarness() {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.success('Profil mis à jour')}>Succès</button>
      <button type="button" onClick={() => toast.error('Enregistrement impossible')}>Erreur</button>
      <button type="button" onClick={() => toast.showToast({ title: 'Message persistant', durationMs: null })}>
        Persistant
      </button>
    </div>
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ToastProvider', () => {
  it('affiche, déduplique et ferme manuellement une confirmation', () => {
    render(<ToastProvider><ToastHarness /></ToastProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Succès' }));
    fireEvent.click(screen.getByRole('button', { name: 'Succès' }));

    expect(screen.getAllByText('Profil mis à jour')).toHaveLength(1);
    expect(screen.getByLabelText('Notifications')).toHaveAttribute('aria-live', 'polite');

    fireEvent.click(screen.getByRole('button', { name: 'Fermer la notification : Profil mis à jour' }));
    expect(screen.queryByText('Profil mis à jour')).not.toBeInTheDocument();
  });

  it('ferme automatiquement les succès mais garde les erreurs plus longtemps', () => {
    render(<ToastProvider><ToastHarness /></ToastProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Succès' }));
    fireEvent.click(screen.getByRole('button', { name: 'Erreur' }));

    act(() => vi.advanceTimersByTime(3_600));
    expect(screen.queryByText('Profil mis à jour')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Enregistrement impossible');

    act(() => vi.advanceTimersByTime(4_500));
    expect(screen.queryByText('Enregistrement impossible')).not.toBeInTheDocument();
  });

  it('permet une notification persistante', () => {
    render(<ToastProvider><ToastHarness /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Persistant' }));

    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText('Message persistant')).toBeInTheDocument();
  });
});
