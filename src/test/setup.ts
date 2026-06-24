import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => undefined,
});

Object.defineProperty(navigator, 'storage', {
  configurable: true,
  value: {
    persisted: async () => false,
    persist: async () => true,
    estimate: async () => ({ usage: 0, quota: 0 }),
  },
});
