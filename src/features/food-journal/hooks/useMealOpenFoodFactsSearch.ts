import { useCallback, useEffect, useRef, useState } from 'react';
import {
  saveOpenFoodFactsProduct,
  type SaveOpenFoodFactsProductResult,
} from '@/application/open-food-facts/openFoodFactsProductService';
import { OpenFoodFactsError } from '@/infrastructure/open-food-facts/OpenFoodFactsError';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { openFoodFactsClient } from '@/infrastructure/open-food-facts/OpenFoodFactsClient';
import { repositories } from '@/infrastructure/repositories/repositories';

export type MealOpenFoodFactsSearchStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface MealOpenFoodFactsSearchState {
  products: OpenFoodFactsProductCandidate[];
  status: MealOpenFoodFactsSearchStatus;
  errorMessage?: string;
  informationMessage?: string;
  totalCount?: number;
}

const initialState: MealOpenFoodFactsSearchState = {
  products: [],
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

export function useMealOpenFoodFactsSearch() {
  const [state, setState] = useState<MealOpenFoodFactsSearchState>(initialState);
  const [savingBarcode, setSavingBarcode] = useState<string>();
  const activeRequest = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const search = useCallback(async (query: string) => {
    const normalizedQuery = query.trim();
    activeRequest.current?.abort();

    if (normalizedQuery.length < 2) {
      setState({
        ...initialState,
        status: 'error',
        errorMessage: 'Saisis au moins deux caractères pour lancer la recherche.',
      });
      return;
    }

    if (isOffline()) {
      setState({
        ...initialState,
        status: 'ready',
        informationMessage:
          'La recherche Open Food Facts nécessite une connexion Internet. Les aliments locaux restent disponibles dans les autres onglets.',
      });
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setState({ ...initialState, status: 'loading' });

    try {
      const result = await openFoodFactsClient.searchProducts(normalizedQuery, controller.signal);
      if (controller.signal.aborted) return;

      setState({
        products: result.products,
        status: 'ready',
        ...(result.totalCount === undefined ? {} : { totalCount: result.totalCount }),
        ...(result.products.length === 0
          ? { informationMessage: 'Aucun produit exploitable ne correspond à cette recherche.' }
          : {}),
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({
        ...initialState,
        status: 'error',
        errorMessage: errorMessageFrom(error),
      });
    }
  }, []);

  const saveCandidate = useCallback(async (
    candidate: OpenFoodFactsProductCandidate,
  ): Promise<SaveOpenFoodFactsProductResult> => {
    setSavingBarcode(candidate.barcode);
    try {
      return await saveOpenFoodFactsProduct(candidate, repositories.food);
    } finally {
      setSavingBarcode(undefined);
    }
  }, []);

  const reset = useCallback(() => {
    activeRequest.current?.abort();
    setState(initialState);
  }, []);

  return {
    ...state,
    savingBarcode,
    search,
    saveCandidate,
    reset,
  };
}
