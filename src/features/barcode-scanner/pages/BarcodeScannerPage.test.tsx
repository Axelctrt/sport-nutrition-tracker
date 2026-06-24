import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BarcodeScannerPage } from '@/features/barcode-scanner/pages/BarcodeScannerPage';
import {
  BarcodeScannerError,
  type BarcodeScanResult,
  type BarcodeScannerPort,
  type BarcodeScannerStartOptions,
} from '@/infrastructure/barcode-scanner/BarcodeScanner';

class FakeBarcodeScanner implements BarcodeScannerPort {
  start = vi.fn(async (options: BarcodeScannerStartOptions) => {
    this.onDetected = options.onDetected;
  });

  stop = vi.fn(async () => undefined);

  onDetected?: (result: BarcodeScanResult) => void;
}

function renderPage(scanner: BarcodeScannerPort) {
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  });

  return render(
    <MemoryRouter initialEntries={['/food/barcode-scanner?date=2026-06-24&slot=lunch']}>
      <BarcodeScannerPage scanner={scanner} />
    </MemoryRouter>,
  );
}

describe('BarcodeScannerPage', () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });
  it('démarre la caméra, confirme deux lectures identiques puis l’arrête', async () => {
    const user = userEvent.setup();
    const scanner = new FakeBarcodeScanner();
    renderPage(scanner);

    await user.click(screen.getByRole('button', { name: 'Démarrer la caméra' }));
    expect(scanner.start).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Lecture en cours')).toBeInTheDocument();

    const scan: BarcodeScanResult = {
      code: '3017624010701',
      format: 'ean_13',
      detectedAt: new Date().toISOString(),
    };

    await act(async () => {
      scanner.onDetected?.(scan);
      scanner.onDetected?.(scan);
    });

    expect(await screen.findByText('3017624010701')).toBeInTheDocument();
    expect(screen.getByText('Format : ean_13')).toBeInTheDocument();
    expect(scanner.stop).toHaveBeenCalled();
  });

  it('affiche une erreur claire lorsque la permission est refusée', async () => {
    const user = userEvent.setup();
    const scanner: BarcodeScannerPort = {
      start: vi.fn(async () => {
        throw new BarcodeScannerError(
          'permission-denied',
          'L’accès à la caméra a été refusé.',
        );
      }),
      stop: vi.fn(async () => undefined),
    };
    renderPage(scanner);

    await user.click(screen.getByRole('button', { name: 'Démarrer la caméra' }));

    expect(await screen.findByText('Impossible d’utiliser la caméra')).toBeInTheDocument();
    expect(screen.getByText('L’accès à la caméra a été refusé.')).toBeInTheDocument();
  });

  it('valide une saisie manuelle sans démarrer la caméra', async () => {
    const user = userEvent.setup();
    const scanner = new FakeBarcodeScanner();
    renderPage(scanner);

    await user.type(screen.getByLabelText('Code-barres'), '012345678905');
    await user.click(screen.getByRole('button', { name: 'Vérifier le code' }));

    expect(screen.getByText('012345678905')).toBeInTheDocument();
    expect(screen.getByText('Format : UPC-A')).toBeInTheDocument();
    expect(scanner.start).not.toHaveBeenCalled();
  });

  it('arrête la caméra au démontage de la page', async () => {
    const user = userEvent.setup();
    const scanner = new FakeBarcodeScanner();
    const view = renderPage(scanner);

    await user.click(screen.getByRole('button', { name: 'Démarrer la caméra' }));
    view.unmount();

    await act(async () => undefined);
    expect(scanner.stop).toHaveBeenCalled();
  });

  it('arrête la caméra lorsque la page passe en arrière-plan', async () => {
    const user = userEvent.setup();
    const scanner = new FakeBarcodeScanner();
    renderPage(scanner);

    await user.click(screen.getByRole('button', { name: 'Démarrer la caméra' }));
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    fireEvent(document, new Event('visibilitychange'));

    expect(scanner.stop).toHaveBeenCalled();
    expect(await screen.findByText('Caméra arrêtée')).toBeInTheDocument();
  });
});
