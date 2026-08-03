import { useEffect } from 'react';

import {
  SYNC_LOCAL_DATA_CHANGED_EVENT,
  syncLocalDataChangedDetail,
} from '@/application/sync/syncLocalChangeEvents';
import { useActionToast } from '@/shared/toast/useActionToast';

const PROFILE_VISIBILITY_UPDATE_REASON = 'social-profile-visibility-update';

export function SocialProfileVisibilityNotifier() {
  const actionToast = useActionToast();

  useEffect(() => {
    const reportVisibilityUpdate = (event: Event) => {
      const detail = syncLocalDataChangedDetail(event);
      if (detail?.reason !== PROFILE_VISIBILITY_UPDATE_REASON) return;

      actionToast.success({
        key: PROFILE_VISIBILITY_UPDATE_REASON,
        title: 'Visibilité du profil mise à jour',
      });
    };

    window.addEventListener(
      SYNC_LOCAL_DATA_CHANGED_EVENT,
      reportVisibilityUpdate,
    );
    return () => {
      window.removeEventListener(
        SYNC_LOCAL_DATA_CHANGED_EVENT,
        reportVisibilityUpdate,
      );
    };
  }, [actionToast]);

  return null;
}
