export const AUTOMATIC_ACCOUNT_SYNC_PREFERENCE_CHANGED_EVENT =
  'sportpilot:automatic-account-sync-preference-changed';

export const CLOUD_ACCOUNT_RESTORED_EVENT =
  'sportpilot:cloud-account-restored';

export function notifyAutomaticAccountSyncPreferenceChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new Event(AUTOMATIC_ACCOUNT_SYNC_PREFERENCE_CHANGED_EVENT),
  );
}

export function notifyCloudAccountRestored(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CLOUD_ACCOUNT_RESTORED_EVENT));
}
