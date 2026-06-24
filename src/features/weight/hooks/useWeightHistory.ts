import { useCallback, useEffect, useState } from 'react';
import { useProfile } from '@/app/providers/profile/useProfile';
import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';
import { repositories } from '@/infrastructure/repositories/repositories';

export type WeightHistoryStatus = 'loading' | 'ready' | 'error';

export function useWeightHistory() {
  const { profile } = useProfile();
  const [status, setStatus] = useState<WeightHistoryStatus>('loading');
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);

    try {
      const storedEntries = await repositories.weight.listAll();
      setEntries(storedEntries);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'L’historique du poids ne peut pas être chargé.',
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (data: NewEntity<WeightEntry>) => {
    await repositories.weight.upsert(data);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (date: LocalDate) => {
    await repositories.weight.deleteByDate(date);
    await refresh();
  }, [refresh]);

  const getApplicableWeight = useCallback((date: LocalDate) => {
    const latestEntry = entries
      .filter((entry) => entry.date <= date)
      .at(-1);

    if (latestEntry) {
      return {
        weightKg: latestEntry.weightKg,
        source: 'entry' as const,
        entry: latestEntry,
      };
    }

    return {
      weightKg: profile?.initialWeightKg ?? 0,
      source: 'profile' as const,
    };
  }, [entries, profile?.initialWeightKg]);

  return {
    status,
    entries,
    errorMessage,
    refresh,
    save,
    remove,
    getApplicableWeight,
  };
}
