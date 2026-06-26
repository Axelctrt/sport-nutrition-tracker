type BooleanState = [boolean, (value: boolean) => void];

const setBooleanState = () => undefined;

export function useRegisterSW() {
  return {
    offlineReady: [false, setBooleanState] as BooleanState,
    needRefresh: [false, setBooleanState] as BooleanState,
    updateServiceWorker: async () => undefined,
  };
}
