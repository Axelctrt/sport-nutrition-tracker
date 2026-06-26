import { act, render, screen } from '@testing-library/react';
import { OfflineStatusBanner } from '@/pwa/OfflineStatusBanner';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('OfflineStatusBanner', () => {
  afterEach(() => {
    setOnline(true);
    vi.useRealTimers();
  });

  it('indique le mode hors connexion puis confirme le retour du réseau', () => {
    vi.useFakeTimers();
    setOnline(false);
    render(<OfflineStatusBanner />);

    expect(screen.getByText(/Mode hors connexion/)).toBeInTheDocument();

    setOnline(true);
    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.getByText('Connexion rétablie.')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByText('Connexion rétablie.')).not.toBeInTheDocument();
  });
});
