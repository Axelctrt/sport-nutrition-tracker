import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type GlobalBannerKind =
  | 'data-risk'
  | 'account-required'
  | 'sync-failure'
  | 'offline'
  | 'pwa-update'
  | 'routine-reminder'
  | 'pwa-ready'
  | 'connection-restored';

const GLOBAL_BANNER_PRIORITIES: Record<GlobalBannerKind, number> = {
  'data-risk': 800,
  'account-required': 700,
  'sync-failure': 600,
  offline: 500,
  'pwa-update': 400,
  'routine-reminder': 300,
  'pwa-ready': 200,
  'connection-restored': 100,
};

interface GlobalBannerRegistration {
  id: string;
  kind: GlobalBannerKind;
}

interface GlobalBannerCoordinatorValue {
  visibleId: string | undefined;
  register: (registration: GlobalBannerRegistration) => void;
  unregister: (id: string) => void;
}

const GlobalBannerCoordinatorContext = createContext<
  GlobalBannerCoordinatorValue | undefined
>(undefined);

function pickVisibleId(
  registrations: ReadonlyMap<string, GlobalBannerKind>,
): string | undefined {
  return [...registrations.entries()]
    .sort(([leftId, leftKind], [rightId, rightKind]) => {
      const priorityDifference =
        GLOBAL_BANNER_PRIORITIES[rightKind] - GLOBAL_BANNER_PRIORITIES[leftKind];
      return priorityDifference || leftId.localeCompare(rightId);
    })[0]?.[0];
}

export function GlobalBannerCoordinatorProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [registrations, setRegistrations] = useState<
    ReadonlyMap<string, GlobalBannerKind>
  >(() => new Map());

  const register = useCallback((registration: GlobalBannerRegistration) => {
    setRegistrations((current) => {
      if (current.get(registration.id) === registration.kind) return current;
      const next = new Map(current);
      next.set(registration.id, registration.kind);
      return next;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setRegistrations((current) => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo<GlobalBannerCoordinatorValue>(() => ({
    visibleId: pickVisibleId(registrations),
    register,
    unregister,
  }), [register, registrations, unregister]);

  return (
    <GlobalBannerCoordinatorContext.Provider value={value}>
      {children}
    </GlobalBannerCoordinatorContext.Provider>
  );
}

export function useGlobalBannerVisibility(
  id: string,
  kind: GlobalBannerKind,
  active: boolean,
): boolean {
  const coordinator = useContext(GlobalBannerCoordinatorContext);
  const register = coordinator?.register;
  const unregister = coordinator?.unregister;

  useLayoutEffect(() => {
    if (!register || !unregister || !active) return undefined;
    register({ id, kind });
    return () => unregister(id);
  }, [active, id, kind, register, unregister]);

  if (!active) return false;
  if (!coordinator) return true;
  return coordinator.visibleId === id;
}
