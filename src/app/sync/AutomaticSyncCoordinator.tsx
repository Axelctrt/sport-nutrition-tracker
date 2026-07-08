import { useEffect, useMemo } from 'react';

import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import { repositories } from '@/infrastructure/repositories/repositories';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { readSyncPrototypeConfigSafely } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import { attachRuntimeSocialActivitySnapshotCloudDelivery } from '@/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotCloudDelivery';
import { reconcileRuntimeSocialActivityPrivacy } from '@/infrastructure/social-activity-snapshots/runtimeSocialActivityPrivacyReconciliation';
import { SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT } from '@/infrastructure/sync-prototype/socialActivityPrivacySyncEvents';

interface NavigatorWithConnection extends Navigator {
  readonly connection?: {
    readonly type?: string;
  };
}

interface AutomaticSyncCoordinatorProps {
  readonly client?: SyncPrototypeClient | null;
}

function resolveClient(): SyncPrototypeClient | null {
  const { config, errorMessage } = readSyncPrototypeConfigSafely();
  if (errorMessage || !config.enabled) return null;

  try {
    return getSyncPrototypeClient();
  } catch {
    return null;
  }
}

function currentConnectionType(): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
  const type = (navigator as NavigatorWithConnection).connection?.type;
  if (type === 'wifi' || type === 'cellular' || type === 'ethernet') {
    return type;
  }
  return 'unknown';
}

export function AutomaticSyncCoordinator({
  client: clientOverride,
}: AutomaticSyncCoordinatorProps) {
  const client = useMemo(
    () => (clientOverride === undefined ? resolveClient() : clientOverride),
    [clientOverride],
  );

  useEffect(() => {
    if (!client) return;

    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repositories.settings,
      eventTarget: window,
      visibilityTarget: document,
      isVisible: () => document.visibilityState === 'visible',
      isOnline: () => navigator.onLine !== false,
      connectionType: currentConnectionType,
    });

    const detachSocialActivitySnapshotDelivery =
      attachRuntimeSocialActivitySnapshotCloudDelivery({
        client,
        eventTarget: window,
        isOnline: () => navigator.onLine !== false,
      });
    const reconcileSocialActivityPrivacy = () => {
      void reconcileRuntimeSocialActivityPrivacy().catch(() => undefined);
    };
    window.addEventListener(
      SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT,
      reconcileSocialActivityPrivacy,
    );

    void controller.initialize().catch(() => undefined);
    return () => {
      window.removeEventListener(
        SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT,
        reconcileSocialActivityPrivacy,
      );
      detachSocialActivitySnapshotDelivery();
      controller.dispose();
    };
  }, [client]);

  return null;
}
