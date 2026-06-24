import { useCallback, useEffect, useState } from 'react';
import type { EntityId } from '@/domain/models/common';
import type { FoodProduct } from '@/domain/models/food';
import { repositories } from '@/infrastructure/repositories/repositories';

export function useFoodProducts(query: string) {
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [archivingId, setArchivingId] = useState<EntityId>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      const nextProducts = query.trim().length > 0
        ? await repositories.food.searchProducts(query, 100)
        : await repositories.food.listProducts();
      setProducts(
        [...nextProducts].sort((left, right) => {
          if (left.isFavorite !== right.isFavorite) {
            return left.isFavorite ? -1 : 1;
          }
          return left.name.localeCompare(right.name, 'fr');
        }),
      );
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les aliments.');
      setStatus('error');
    }
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const archive = useCallback(async (id: EntityId) => {
    setArchivingId(id);
    try {
      await repositories.food.archiveProduct(id);
      await refresh();
    } finally {
      setArchivingId(undefined);
    }
  }, [refresh]);

  return { products, status, errorMessage, archivingId, refresh, archive };
}
