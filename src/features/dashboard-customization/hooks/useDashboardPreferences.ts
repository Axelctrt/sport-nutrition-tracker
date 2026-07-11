import { useCallback, useEffect, useState } from 'react';
import {
  createDefaultDashboardPreferences,
  normalizeDashboardPreferences,
  type DashboardDensity,
  type DashboardPreferences,
} from '@/domain/dashboard/dashboardPreferences';
import { repositories } from '@/infrastructure/repositories/repositories';

export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<DashboardPreferences>(
    createDefaultDashboardPreferences,
  );
  const [density, setDensity] = useState<DashboardDensity>('comfortable');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      const settings = await repositories.settings.get();
      setPreferences(normalizeDashboardPreferences(settings.dashboardPreferences));
      setDensity(settings.dashboardDensity ?? 'comfortable');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'La personnalisation du tableau de bord n’a pas pu être chargée.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { preferences, density, isLoading, errorMessage, refresh };
}
