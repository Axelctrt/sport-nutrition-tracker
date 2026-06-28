import { vi } from 'vitest';

import {
  publishTrashUndoAvailable,
  subscribeTrashUndoAvailable,
} from '@/shared/trash/trashUndoEvents';

describe('trashUndoEvents', () => {
  it('publie les suppressions puis permet de se désabonner', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTrashUndoAvailable(listener);

    publishTrashUndoAvailable({
      trashItemId: 'activity:activity-1',
      label: 'Activité course du 2026-06-28',
    });

    expect(listener).toHaveBeenCalledWith({
      trashItemId: 'activity:activity-1',
      label: 'Activité course du 2026-06-28',
    });

    unsubscribe();

    publishTrashUndoAvailable({
      trashItemId: 'weight:weight-1',
      label: 'Pesée du 2026-06-28',
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
