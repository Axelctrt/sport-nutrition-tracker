import { useEffect } from 'react';
import { useBlocker, useInRouterContext } from 'react-router-dom';

import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';

interface UnsavedChangesGuardProps {
  when: boolean;
}

function RouterGuard({ when }: UnsavedChangesGuardProps) {
  const blocker = useBlocker(when);

  return (
    <ConfirmationDialog
      open={blocker.state === 'blocked'}
      title="Quitter sans enregistrer ?"
      description="Les modifications non enregistrées seront perdues."
      confirmLabel="Quitter"
      cancelLabel="Continuer la modification"
      onCancel={() => {
        if (blocker.state === 'blocked') blocker.reset();
      }}
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed();
      }}
    />
  );
}

export function UnsavedChangesGuard({ when }: UnsavedChangesGuardProps) {
  const inRouter = useInRouterContext();

  useEffect(() => {
    if (!when) return;
    const block = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', block);
    return () => window.removeEventListener('beforeunload', block);
  }, [when]);

  return inRouter ? <RouterGuard when={when} /> : null;
}
