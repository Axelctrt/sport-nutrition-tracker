import { Cloud, Database, LogOut, ShieldCheck } from 'lucide-react';
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { DataSpaceDescriptor } from '@/domain/data-spaces/dataSpace';
import {
  activateGuestDataSpace,
  type DataSpaceStorage,
} from '@/infrastructure/data-spaces/dataSpaceRegistry';
import {
  activateExistingAccountDataSpace,
  attachCurrentDataToAccountSpace,
  createEmptyAccountDataSpace,
  findAccountDataSpace,
} from '@/infrastructure/data-spaces/accountDataSpaceService';
import { activeDataSpace } from '@/infrastructure/database/database';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { readSyncPrototypeConfigSafely } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import { createSyncPrototypeAccountFingerprint } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import { AppSplashScreen } from '@/shared/ui/AppSplashScreen';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface DataSpaceAccountGateProps {
  children: ReactNode;
  client?: SyncPrototypeClient | null;
  currentSpace?: DataSpaceDescriptor;
  storage?: DataSpaceStorage;
  reload?: () => void;
  attachData?: typeof attachCurrentDataToAccountSpace;
  createEmptySpace?: typeof createEmptyAccountDataSpace;
  activateExistingSpace?: typeof activateExistingAccountDataSpace;
}

type GateState =
  | { readonly status: 'loading'; readonly message: string }
  | { readonly status: 'ready' }
  | {
      readonly status: 'choice';
      readonly accountFingerprint: string;
      readonly hasExistingSpace: boolean;
      readonly canAttachCurrentData: boolean;
    }
  | { readonly status: 'working'; readonly message: string }
  | { readonly status: 'error'; readonly message: string };

function accountFingerprintFromSnapshot(
  snapshot: SyncPrototypeSnapshot,
): string | undefined {
  return createSyncPrototypeAccountFingerprint(
    snapshot.account.userId ?? snapshot.account.email,
  )?.toLowerCase();
}

function defaultReload(): void {
  window.location.reload();
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'L’espace de données n’a pas pu être préparé.';
}

export function DataSpaceAccountGate({
  children,
  client: clientOverride,
  currentSpace = activeDataSpace,
  storage,
  reload = defaultReload,
  attachData = attachCurrentDataToAccountSpace,
  createEmptySpace = createEmptyAccountDataSpace,
  activateExistingSpace = activateExistingAccountDataSpace,
}: DataSpaceAccountGateProps) {
  const runtimeClient = useMemo<SyncPrototypeClient | null>(() => {
    if (clientOverride !== undefined) return clientOverride;

    const { config } = readSyncPrototypeConfigSafely();
    if (!config.enabled) return null;

    try {
      return getSyncPrototypeClient();
    } catch {
      return null;
    }
  }, [clientOverride]);

  const [state, setState] = useState<GateState>(() =>
    runtimeClient
      ? { status: 'loading', message: 'Vérification du compte connecté' }
      : { status: 'ready' },
  );

  useEffect(() => {
    if (!runtimeClient) {
      setState({ status: 'ready' });
      return;
    }

    let disposed = false;
    let initialized = false;
    let switchingToGuest = false;

    const reconcile = () => {
      if (disposed || !initialized || switchingToGuest) return;

      const snapshot = runtimeClient.getSnapshot();
      if (snapshot.account.isLoading) {
        setState({
          status: 'loading',
          message: 'Vérification du compte connecté',
        });
        return;
      }

      if (!snapshot.account.isLoggedIn) {
        if (currentSpace.kind === 'account') {
          switchingToGuest = true;
          setState({
            status: 'working',
            message: 'Retour à l’espace local invité',
          });
          activateGuestDataSpace(storage);
          reload();
          return;
        }

        setState({ status: 'ready' });
        return;
      }

      const accountFingerprint = accountFingerprintFromSnapshot(snapshot);
      if (!accountFingerprint) {
        setState({
          status: 'error',
          message:
            'Le compte connecté ne fournit pas d’identifiant local exploitable. Déconnecte-toi puis réessaie.',
        });
        return;
      }

      if (
        currentSpace.kind === 'account' &&
        currentSpace.accountFingerprint === accountFingerprint
      ) {
        setState({ status: 'ready' });
        return;
      }

      setState({
        status: 'choice',
        accountFingerprint,
        hasExistingSpace: Boolean(
          findAccountDataSpace(accountFingerprint, storage),
        ),
        canAttachCurrentData: currentSpace.kind === 'guest',
      });
    };

    const unsubscribe = runtimeClient.subscribe(reconcile);

    void runtimeClient
      .initialize()
      .then(() => {
        if (disposed) return;
        initialized = true;
        reconcile();
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setState({
          status: 'error',
          message: errorMessage(error),
        });
      });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [currentSpace, reload, runtimeClient, storage]);

  const runAction = async (
    message: string,
    action: () => Promise<unknown> | unknown,
  ) => {
    setState({ status: 'working', message });
    try {
      await action();
      reload();
    } catch (error) {
      setState({ status: 'error', message: errorMessage(error) });
    }
  };

  if (state.status === 'ready') return children;

  if (state.status === 'loading' || state.status === 'working') {
    return <AppSplashScreen message={state.message} />;
  }

  if (state.status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-10">
        <div className="w-full max-w-xl">
          <InlineNotice tone="error" title="Espace de données indisponible">
            {state.message}
          </InlineNotice>
          {runtimeClient ? (
            <Button
              className="mt-4 w-full"
              variant="secondary"
              onClick={() => void runtimeClient.logout()}
            >
              <LogOut aria-hidden="true" className="size-4" />
              Se déconnecter du compte
            </Button>
          ) : null}
        </div>
      </main>
    );
  }

  const serviceOptions = storage ? { storage } : {};

  const openExisting = () =>
    runAction('Ouverture de l’espace du compte', () =>
      activateExistingSpace(state.accountFingerprint, serviceOptions),
    );

  const createEmpty = () =>
    runAction('Création d’un espace vide et isolé', () =>
      createEmptySpace(state.accountFingerprint, serviceOptions),
    );

  const attachGuest = () =>
    runAction('Copie sécurisée des données locales', () =>
      attachData(state.accountFingerprint, serviceOptions),
    );

  return (
    <main className="min-h-screen px-5 py-8 sm:grid sm:place-items-center">
      <Card className="mx-auto w-full max-w-2xl p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
              Protection des données
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Choisir l’espace de ce compte
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              SportPilot bloque l’accès aux données actuelles tant que le compte connecté n’est pas associé à son propre espace local.
            </p>
          </div>
        </div>

        {state.hasExistingSpace ? (
          <section className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <Cloud aria-hidden="true" className="mt-0.5 size-5 text-brand-700 dark:text-brand-300" />
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  Espace déjà connu sur cet appareil
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Ouvre l’espace local précédemment associé à ce compte. Les autres espaces restent fermés et inchangés.
                </p>
              </div>
            </div>
            <Button className="mt-4 w-full" onClick={() => void openExisting()}>
              Ouvrir l’espace de ce compte
            </Button>
          </section>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {state.canAttachCurrentData ? (
              <section className="rounded-2xl border border-brand-200 p-4 dark:border-brand-900">
                <Database aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
                <h2 className="mt-3 font-semibold text-slate-950 dark:text-white">
                  Rattacher les données locales
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Copie le profil, les séances, la nutrition, les pesées et les réglages de l’espace invité vers ce compte. L’espace invité d’origine reste intact.
                </p>
                <Button className="mt-4 w-full" onClick={() => void attachGuest()}>
                  Rattacher mes données
                </Button>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <Cloud aria-hidden="true" className="size-5 text-slate-600 dark:text-slate-300" />
              <h2 className="mt-3 font-semibold text-slate-950 dark:text-white">
                Commencer avec un espace vide
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Crée une base locale neuve pour ce compte. Aucune donnée de l’espace actuel n’est copiée ou supprimée.
              </p>
              <Button
                className="mt-4 w-full"
                variant="secondary"
                onClick={() => void createEmpty()}
              >
                Commencer avec un espace vide
              </Button>
            </section>
          </div>
        )}

        <Button
          className="mt-5 w-full"
          variant="ghost"
          onClick={() => void runtimeClient?.logout()}
        >
          <LogOut aria-hidden="true" className="size-4" />
          Se déconnecter du compte
        </Button>
      </Card>
    </main>
  );
}
