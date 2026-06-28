import {
  Fragment,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { appDatabase } from '@/infrastructure/database/database';
import { restoreTrashItem } from '@/infrastructure/repositories/dexie/trashService';
import { useToast } from '@/shared/toast/useToast';
import { subscribeTrashUndoAvailable } from '@/shared/trash/trashUndoEvents';

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Une erreur inconnue empêche la restauration.';
}

export function TrashUndoCoordinator({
  children,
}: PropsWithChildren) {
  const toast = useToast();
  const [revision, setRevision] = useState(0);

  useEffect(
    () =>
      subscribeTrashUndoAvailable((event) => {
        toast.showToast({
          title: 'Élément déplacé dans la corbeille',
          description: event.label,
          tone: 'info',
          durationMs: 8_000,
          dedupeKey: `trash-undo:${event.trashItemId}`,
          action: {
            label: 'Annuler',
            ariaLabel: `Annuler la suppression : ${event.label}`,
            onClick: async () => {
              try {
                await restoreTrashItem(
                  appDatabase,
                  event.trashItemId,
                );

                setRevision((current) => current + 1);
                toast.success('Suppression annulée', event.label);
              } catch (error) {
                toast.error(
                  'Impossible d’annuler la suppression',
                  errorMessage(error),
                );
              }
            },
          },
        });
      }),
    [toast],
  );

  return <Fragment key={revision}>{children}</Fragment>;
}
