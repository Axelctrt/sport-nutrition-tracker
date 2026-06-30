import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { resetGoalStateRuntimeForTests } from '@/domain/goals/goalState';
import { resetEndurancePlanningRuntimeForTests } from '@/domain/planning/endurancePlanningState';
import { resetRoutineReminderCompletionRuntimeForTests } from '@/domain/reminders/routineReminderCompletionState';
import { resetAchievementStateRuntimeForTests } from '@/domain/rewards/achievements';
import { resetVisualThemeStateRuntimeForTests } from '@/domain/rewards/visualThemes';
import { resetWeeklyMissionHistoryRuntimeForTests } from '@/domain/rewards/weeklyMissionHistory';

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
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
  configurable: true,
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

interface PropertyBaseline {
  target: object;
  property: PropertyKey;
  descriptor: PropertyDescriptor | undefined;
}

const propertyBaselines: PropertyBaseline[] = [
  { target: Element.prototype, property: 'scrollIntoView', descriptor: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView') },
  { target: HTMLElement.prototype, property: 'scrollIntoView', descriptor: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView') },
  { target: window, property: 'requestAnimationFrame', descriptor: Object.getOwnPropertyDescriptor(window, 'requestAnimationFrame') },
  { target: window, property: 'scrollTo', descriptor: Object.getOwnPropertyDescriptor(window, 'scrollTo') },
  { target: window, property: 'scrollY', descriptor: Object.getOwnPropertyDescriptor(window, 'scrollY') },
  { target: window, property: 'isSecureContext', descriptor: Object.getOwnPropertyDescriptor(window, 'isSecureContext') },
  { target: navigator, property: 'onLine', descriptor: Object.getOwnPropertyDescriptor(navigator, 'onLine') },
  { target: navigator, property: 'storage', descriptor: Object.getOwnPropertyDescriptor(navigator, 'storage') },
];

function restoreProperty({ target, property, descriptor }: PropertyBaseline) {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor);
    return;
  }
  Reflect.deleteProperty(target, property);
}

afterEach(() => {
  resetGoalStateRuntimeForTests();
  resetEndurancePlanningRuntimeForTests();
  resetAchievementStateRuntimeForTests();
  resetVisualThemeStateRuntimeForTests();
  resetWeeklyMissionHistoryRuntimeForTests();
  resetRoutineReminderCompletionRuntimeForTests();
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  propertyBaselines.forEach(restoreProperty);
});
