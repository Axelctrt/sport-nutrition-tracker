import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EntityId } from '@/domain/models/common';
import type { FoodProduct } from '@/domain/models/food';
import { repositories } from '@/infrastructure/repositories/repositories';

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('fr');
}

function sortProducts(products: readonly FoodProduct[]): FoodProduct[] {
  return [...products].sort((left, right) => {
    if (left.isFavorite !== right.isFavorite) {
      return left.isFavorite ? -1 : 1;
    }
    return left.name.localeCompare(right.name, 'fr');
  });
}

export function useFoodProducts(query: string) {
  const [allProducts, setAllProducts] = useState<FoodProduct[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [archivingId, setArchivingId] = useState<EntityId>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      setAllProducts(sortProducts(await repositories.food.listProducts()));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les aliments.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const products = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return allProducts;

    return allProducts.filter((product) => [
      product.name,
      product.brand,
      product.barcode,
    ].some((value) => value?.toLocaleLowerCase('fr').includes(normalizedQuery)));
  }, [allProducts, query]);

  const archive = useCallback(async (id: EntityId): Promise<boolean> => {
    setArchivingId(id);
    setErrorMessage(undefined);
    try {
      await repositories.food.archiveProduct(id);
      setAllProducts((current) => current.filter((product) => product.id !== id));
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible d’archiver cet aliment.');
      return false;
    } finally {
      setArchivingId(undefined);
    }
  }, []);

  return {
    products,
    allProducts,
    status,
    errorMessage,
    archivingId,
    refresh,
    archive,
  };
}
