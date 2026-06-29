import type { RouteObject } from 'react-router-dom';
import { LazySyncPrototypePage } from '@/app/LazyRoutePages';
import { routePaths } from '@/app/routePaths';
import {
  readSyncPrototypeConfig,
  type SyncPrototypeEnvironment,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';

export function getSyncPrototypeRoutes(
  environment: SyncPrototypeEnvironment = import.meta.env,
): RouteObject[] {
  const config = readSyncPrototypeConfig(environment);

  return config.enabled
    ? [
        {
          path: routePaths.syncPrototype,
          element: <LazySyncPrototypePage />,
        },
      ]
    : [];
}
