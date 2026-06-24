import { useCallback, useEffect, useRef, useState } from 'react';
import type { FoodProduct } from '@/domain/models/food';
import {
  saveOpenFoodFactsProduct,
  type SaveOpenFoodFactsProductResult,
} from '@/application/open-food-facts/openFoodFactsProductService';
import { OpenFoodFactsError } from '@/infrastructure/open-food-facts/OpenFoodFactsError';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { openFoodFactsClient } from '@/infrastructure/open-food-facts/OpenFoodFactsClient';
import { normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';
import { repositories } from '@/infrastructure/repositories/repositories';

export type OpenFoodFactsSearchStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface OpenFoodFactsSearchState {
  remoteProducts: OpenFoodFactsProductCandidate[];
  localProducts: FoodProduct[];
  status: OpenFoodFactsSearchStatus;
  errorMessage?: string;
  informationMessage?: string;
  totalCount?: number;
}

const initialState: OpenFoodFactsSearchState = {
  remoteProducts: [],
  localProducts: [],
  status: 'idle',
};

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function errorMessageFrom(error: unknown): string {
  if (error instanceof OpenFoodFactsError) return error.message;
  return error instanceof Error
    ? error.message
    : 'La recherche Open Food Facts a échoué.';
}

export function useOpenFoodFactsSearch() {
  const [state, setState] = useState<OpenFoodFactsSearchState>(initialState);
  const [savingBarcode, setSavingBarcode] = useState<string>();
  const [lastTextQuery, setLastTextQuery] = useState<string>();
  const [lastBarcode, setLastBarcode] = useState<string>();
  const activeRequest = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const startRequest = useCallback(() => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    return controller;
  }, []);

  const searchText = useCallback(async (query: string) => {
    const controller = startRequest();
    setLastTextQuery(query);
    setLastBarcode(undefined);
    setState({ ...initialState, status: 'loading' });

    let localProducts: FoodProduct[] = [];
    try {
      localProducts = await repositories.food.searchProducts(query, 12);
    } catch {
      localProducts = [];
    }

    if (isOffline()) {
      setState({
        remoteProducts: [],
        localProducts,
        status: 'ready',
        informationMessage: localProducts.length > 0
          ? 'Mode hors connexion : seuls les aliments déjà enregistrés sont affichés.'
          : 'Mode hors connexion : aucun aliment local ne correspond à cette recherche.',
      });
      return;
    }

    try {
      const result = await openFoodFactsClient.searchProducts(query, controller.signal);
      if (controller.signal.aborted) return;
      setState({
        remoteProducts: result.products,
        localProducts,
        status: 'ready',
        ...(result.totalCount === undefined ? {} : { totalCount: result.totalCount }),
        ...(result.products.length === 0
          ? { informationMessage: 'Aucun produit externe ne correspond à cette recherche.' }
          : {}),
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({
        remoteProducts: [],
        localProducts,
        status: 'error',
        errorMessage: errorMessageFrom(error),
        ...(localProducts.length > 0
          ? { informationMessage: 'Les résultats locaux restent disponibles ci-dessous.' }
          : {}),
      });
    }
  }, [startRequest]);

  const searchBarcode = useCallback(async (barcode: string) => {
    const normalizedBarcode = normalizeOpenFoodFactsBarcode(barcode);
    const controller = startRequest();
    setLastBarcode(normalizedBarcode);
    setLastTextQuery(undefined);
    setState({ ...initialState, status: 'loading' });

    let localProduct: FoodProduct | undefined;
    try {
      localProduct = await repositories.food.findProductByBarcode(normalizedBarcode);
    } catch {
      localProduct = undefined;
    }
    const localProducts = localProduct ? [localProduct] : [];

    if (isOffline()) {
      setState({
        remoteProducts: [],
        localProducts,
        status: 'ready',
        informationMessage: localProduct
          ? 'Mode hors connexion : le produit enregistré localement est disponible.'
          : 'Mode hors connexion : ce code-barres n’est pas enregistré sur cet appareil.',
      });
      return;
    }

    try {
      const product = await openFoodFactsClient.getProductByBarcode(
        normalizedBarcode,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setState({
        remoteProducts: product ? [product] : [],
        localProducts,
        status: 'ready',
        ...(!product
          ? { informationMessage: 'Ce code-barres est absent d’Open Food Facts.' }
          : {}),
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({
        remoteProducts: [],
        localProducts,
        status: 'error',
        errorMessage: errorMessageFrom(error),
        ...(localProduct
          ? { informationMessage: 'La version locale du produit reste disponible.' }
          : {}),
      });
    }
  }, [startRequest]);

  const saveCandidate = useCallback(async (
    candidate: OpenFoodFactsProductCandidate,
  ): Promise<SaveOpenFoodFactsProductResult> => {
    setSavingBarcode(candidate.barcode);
    try {
      const result = await saveOpenFoodFactsProduct(candidate, repositories.food);

      if (lastTextQuery) {
        const localProducts = await repositories.food.searchProducts(lastTextQuery, 12);
        setState((current) => ({ ...current, localProducts }));
      } else if (lastBarcode) {
        setState((current) => ({ ...current, localProducts: [result.product] }));
      }

      return result;
    } finally {
      setSavingBarcode(undefined);
    }
  }, [lastBarcode, lastTextQuery]);

  const reset = useCallback(() => {
    activeRequest.current?.abort();
    setState(initialState);
    setLastBarcode(undefined);
    setLastTextQuery(undefined);
  }, []);

  return {
    ...state,
    savingBarcode,
    searchText,
    searchBarcode,
    saveCandidate,
    reset,
  };
}
