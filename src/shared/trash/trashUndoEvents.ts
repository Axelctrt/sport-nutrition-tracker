export interface TrashUndoAvailableEvent {
  trashItemId: string;
  label: string;
}

type TrashUndoAvailableListener = (
  event: TrashUndoAvailableEvent,
) => void;

const listeners = new Set<TrashUndoAvailableListener>();

export function publishTrashUndoAvailable(
  event: TrashUndoAvailableEvent,
): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Une notification ne doit jamais faire échouer la suppression validée.
    }
  }
}

export function subscribeTrashUndoAvailable(
  listener: TrashUndoAvailableListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
