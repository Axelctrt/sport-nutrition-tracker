import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { BarcodeProductLookupResult } from '@/application/open-food-facts/barcodeProductLookupService';
import type { FoodProduct } from '@/domain/models/food';
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

const product: FoodProduct = {
  id: 'product-1',
  createdAt: '2026-06-24T12:00:00.000Z',
  updatedAt: '2026-06-24T12:00:00.000Z',
  name: 'Pâte à tartiner',
  brand: 'Test',
  basisUnit: 'g',
  servingSize: 15,
  nutritionPer100: {
    caloriesKcal: 530,
    proteinGrams: 6,
    carbohydratesGrams: 57,
    fatGrams: 31,
  },
  barcode: '3017624010701',
  source: { type: 'manual' },
  isNutritionComplete: true,
  isFavorite: false,
  isArchived: false,
};

function renderPage(
  scanner: BarcodeScannerPort,
  lookupProduct: (barcode: string, signal?: AbortSignal) => Promise<BarcodeProductLookupResult> = async (barcode) => ({
    status: 'local',
    barcode,
    product,
  }),
  saveEntry = vi.fn(async () => undefined),
) {
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  });

  return {
    saveEntry,
    ...render(
      <MemoryRouter initialEntries={['/food/barcode-scanner?date=2026-06-24&slot=lunch']}>
        <Routes>
          <Route
            path="/food/barcode-scanner"
            element={(
              <BarcodeScannerPage
                scanner={scanner}
                lookupProduct={lookupProduct}
                saveEntry={saveEntry}
              />
            )}
          />
          <Route path="/food" element={<p>Retour au journal réussi</p>} />
        </Routes>
      </MemoryRouter>,
    ),
  };
}

const scan: BarcodeScanResult = {
  code: '3017624010701',
  format: 'ean_13',
  detectedAt: new Date().toISOString(),
};

describe('BarcodeScannerPage', () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  it('détecte un code, trouve le produit local et l’ajoute au repas présélectionné', async () => {
    const user = userEvent.setup();
    const scanner = new FakeBarcodeScanner();
    const lookupProduct = vi.fn(async (barcode: string): Promise<BarcodeProductLookupResult> => ({
      status: 'local',
      barcode,
      product,
    }));
    const { saveEntry } = renderPage(scanner, lookupProduct);

    await user.click(screen.getByRole('button', { name: 'Démarrer la caméra' }));
    expect(scanner.start).toHaveBeenCalledTimes(1);

    await act(async () => {
      scanner.onDetected?.(scan);
      scanner.onDetected?.(scan);
    });

    expect(await screen.findByText('Produit trouvé dans les aliments locaux. Il reste disponible hors connexion.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pâte à tartiner' })).toBeInTheDocument();
    expect(lookupProduct).toHaveBeenCalledWith('3017624010701', expect.any(AbortSignal));
    expect(scanner.stop).toHaveBeenCalled();

    const quantityInput = await screen.findByRole('spinbutton', {
      name: /Quantité en g/i,
    });

    await user.clear(quantityInput);
    await user.type(quantityInput, '80');
    await user.click(screen.getByRole('button', { name: 'Ajouter au déjeuner' }));

    await waitFor(() => {
      expect(saveEntry).toHaveBeenCalledWith(expect.objectContaining({
        date: '2026-06-24',
        mealSlot: 'lunch',
        productId: 'product-1',
        inputQuantity: 80,
      }));
    });
    expect(await screen.findByText('Retour au journal réussi')).toBeInTheDocument();
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

  it('recherche un code saisi manuellement sans démarrer la caméra', async () => {
    const user = userEvent.setup();
    const scanner = new FakeBarcodeScanner();
    const lookupProduct = vi.fn(async (barcode: string): Promise<BarcodeProductLookupResult> => ({
      status: 'local',
      barcode,
      product,
    }));
    renderPage(scanner, lookupProduct);

    await user.type(screen.getByLabelText('Code-barres'), '3017624010701');
    await user.click(screen.getByRole('button', { name: 'Rechercher ce produit' }));

    expect(await screen.findByText('Produit trouvé dans les aliments locaux. Il reste disponible hors connexion.')).toBeInTheDocument();
    expect(lookupProduct).toHaveBeenCalledWith('3017624010701', expect.any(AbortSignal));
    expect(scanner.start).not.toHaveBeenCalled();
  });

  it('propose les secours quand le produit est absent hors connexion', async () => {
    const user = userEvent.setup();
    const scanner = new FakeBarcodeScanner();
    renderPage(scanner, async (barcode) => ({ status: 'offline-missing', barcode }));

    await user.type(screen.getByLabelText('Code-barres'), '3017624010701');
    await user.click(screen.getByRole('button', { name: 'Rechercher ce produit' }));

    expect(await screen.findByText(/Une connexion Internet est nécessaire/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Créer l’aliment manuellement' })).toHaveAttribute(
      'href',
      '/food/products/new?returnDate=2026-06-24&returnSlot=lunch&barcode=3017624010701',
    );
    expect(screen.getByRole('link', { name: 'Rechercher par texte' })).toHaveAttribute(
      'href',
      '/food/select?date=2026-06-24&slot=lunch&source=openFoodFacts',
    );
  });


  it('affiche l’erreur Open Food Facts sans perdre les solutions de secours', async () => {
    const user = userEvent.setup();
    const scanner = new FakeBarcodeScanner();
    renderPage(scanner, async () => {
      throw new Error('Open Food Facts est temporairement indisponible.');
    });

    await user.type(screen.getByLabelText('Code-barres'), '3017624010701');
    await user.click(screen.getByRole('button', { name: 'Rechercher ce produit' }));

    expect(await screen.findByText('Open Food Facts est temporairement indisponible.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Créer l’aliment manuellement' })).toBeInTheDocument();
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
