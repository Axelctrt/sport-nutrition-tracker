export const REAL_WEIGHT_DATA_CHANGED_EVENT =
  'sportpilot:real-weight-data-changed';
export const AUTOMATIC_WEIGHT_SYNC_PREFERENCE_CHANGED_EVENT =
  'sportpilot:automatic-weight-sync-preference-changed';

export type RealWeightChangeReason = 'upsert' | 'delete';

export function notifyRealWeightDataChanged(
  reason: RealWeightChangeReason,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(REAL_WEIGHT_DATA_CHANGED_EVENT, { detail: { reason } }),
  );
}

export function notifyAutomaticWeightSyncPreferenceChanged(
  enabled: boolean,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(AUTOMATIC_WEIGHT_SYNC_PREFERENCE_CHANGED_EVENT, {
      detail: { enabled },
    }),
  );
}
