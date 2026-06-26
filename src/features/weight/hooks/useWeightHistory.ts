import { useCallback, useEffect, useState } from 'react';
import { useProfile } from '@/app/providers/profile/useProfile';
import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';
import { repositories } from '@/infrastructure/repositories/repositories';

export type WeightHistoryStatus = 'loading' | 'ready' | 'error';

function sortEntries(entries: readonly WeightEntry[]): WeightEntry[] {
  return [...entries].sort((left, right) => left.date.localeCompare(right.date));
}

export function useWeightHistory() {
  const { profile } = useProfile();
  const [status, setStatus] = useState<WeightHistoryStatus>('loading');
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    setErrorMessage(undefined);

    try {
      const storedEntries = await repositories.weight.listAll();
      setEntries(sortEntries(storedEntries));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'L’historique du poids ne peut pas être chargé.',
      );
      if (!silent) setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (data: NewEntity<WeightEntry>) => {
    const saved = await repositories.weight.upsert(data);
    setEntries((current) => sortEntries([
      ...current.filter((entry) => entry.date !== saved.date),
      saved,
    ]));
    setStatus('ready');
    setErrorMessage(undefined);
    return saved;
  }, []);

  const remove = useCallback(async (date: LocalDate) => {
    await repositories.weight.deleteByDate(date);
    setEntries((current) => current.filter((entry) => entry.date !== date));
    setStatus('ready');
    setErrorMessage(undefined);
  }, []);

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
