import { useEffect } from 'react';
import { getWeightSyncIntegration } from '@/infrastructure/sync-prototype/weightSyncIntegration';

export function WeightSyncCoordinator() {
  useEffect(() => {
    void getWeightSyncIntegration().initialize().catch(() => undefined);
  }, []);

  return null;
}
