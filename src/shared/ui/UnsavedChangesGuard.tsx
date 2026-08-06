import { useContext, useEffect } from 'react';
import {
  UNSAFE_DataRouterContext,
  useBlocker,
} from 'react-router-dom';

import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';

interface UnsavedChangesGuardProps {
  when: boolean;
}

function useBeforeUnloadGuard(when: boolean) {
  useEffect(() => {
    if (!when) return;
    const block = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', block);
    return () => window.removeEventListener('beforeunload', block);
  }, [when]);
}

function DataRouterUnsavedChangesGuard({ when }: UnsavedChangesGuardProps) {
  const blocker = useBlocker(when);

  return (
    <ConfirmationDialog
      open={blocker.state === 'blocked'}
      title="Quitter sans enregistrer ?"
      description="Les changements seront perdus."
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
  const dataRouterContext = useContext(UNSAFE_DataRouterContext);
  useBeforeUnloadGuard(when);

  if (!dataRouterContext) return null;
  return <DataRouterUnsavedChangesGuard when={when} />;
}
