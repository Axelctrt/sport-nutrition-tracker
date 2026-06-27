type BooleanSetter = (value: boolean) => void;
type BooleanState = [boolean, BooleanSetter];
type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

interface RegisterSWMockState {
  offlineReady: boolean;
  needRefresh: boolean;
  setOfflineReady: BooleanSetter;
  setNeedRefresh: BooleanSetter;
  updateServiceWorker: UpdateServiceWorker;
}

function createDefaultState(): RegisterSWMockState {
  return {
    offlineReady: false,
    needRefresh: false,
    setOfflineReady: () => undefined,
    setNeedRefresh: () => undefined,
    updateServiceWorker: async () => undefined,
  };
}

let mockState = createDefaultState();

export function configurePwaRegisterMock(
  overrides: Partial<RegisterSWMockState>,
): void {
  mockState = { ...mockState, ...overrides };
}

export function resetPwaRegisterMock(): void {
  mockState = createDefaultState();
}

export function useRegisterSW(_options?: unknown) {
  return {
    offlineReady: [mockState.offlineReady, mockState.setOfflineReady] as BooleanState,
    needRefresh: [mockState.needRefresh, mockState.setNeedRefresh] as BooleanState,
    updateServiceWorker: mockState.updateServiceWorker,
  };
}
