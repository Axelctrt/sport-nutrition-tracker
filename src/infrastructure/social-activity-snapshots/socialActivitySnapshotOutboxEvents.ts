export const SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT =
  'sportpilot:social-activity-snapshot-outbox-changed';

export function notifySocialActivitySnapshotOutboxChanged(
  target: EventTarget | undefined = typeof window === 'undefined' ? undefined : window,
): void {
  target?.dispatchEvent(new Event(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT));
}
