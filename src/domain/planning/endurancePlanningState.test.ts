import {
  ENDURANCE_PLANNING_CHANGED_EVENT,
  ENDURANCE_PLANNING_PERSISTED_EVENT,
  ENDURANCE_PLANNING_STORAGE_KEY,
  emptyEndurancePlanningState,
  flushEndurancePlanningPersistence,
  hydrateEndurancePlanningRuntime,
  readEndurancePlanningState,
  resetEndurancePlanningRuntimeForTests,
  writeEndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';

function state(title = 'Sortie facile') {
  return {
    version: 1 as const,
    sessions: [
      {
        id: 'plan-1',
        title,
        activityType: 'running' as const,
        date: '2026-08-19',
        intensity: 'low' as const,
        targetDurationMinutes: 45,
        status: 'planned' as const,
        createdAt: '2026-08-18T10:00:00.000Z',
        updatedAt: '2026-08-18T10:00:00.000Z',
      },
    ],
  };
}

describe('endurancePlanningState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetEndurancePlanningRuntimeForTests();
  });

  afterEach(() => {
    resetEndurancePlanningRuntimeForTests();
  });

  it('retourne un état vide si le stockage est absent ou invalide', () => {
    expect(readEndurancePlanningState()).toEqual(emptyEndurancePlanningState());
    window.localStorage.setItem(ENDURANCE_PLANNING_STORAGE_KEY, '{invalid');
    expect(readEndurancePlanningState()).toEqual(emptyEndurancePlanningState());
  });

  it('garde CHANGED comme signal UI immédiat sans prétendre à une persistance durable hors runtime', () => {
    const changed = vi.fn();
    const persisted = vi.fn();
    window.addEventListener(ENDURANCE_PLANNING_CHANGED_EVENT, changed);
    window.addEventListener(ENDURANCE_PLANNING_PERSISTED_EVENT, persisted);

    writeEndurancePlanningState(state());

    expect(readEndurancePlanningState().sessions).toHaveLength(1);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(persisted).not.toHaveBeenCalled();

    window.removeEventListener(ENDURANCE_PLANNING_CHANGED_EVENT, changed);
    window.removeEventListener(ENDURANCE_PLANNING_PERSISTED_EVENT, persisted);
  });

  it('émet PERSISTED uniquement après la persistance durable réussie', async () => {
    let resolvePersist!: () => void;
    const persistence = new Promise<void>((resolve) => { resolvePersist = resolve; });
    const persist = vi.fn(() => persistence);
    const changed = vi.fn();
    const persisted = vi.fn();
    hydrateEndurancePlanningRuntime(emptyEndurancePlanningState(), persist);
    window.addEventListener(ENDURANCE_PLANNING_CHANGED_EVENT, changed);
    window.addEventListener(ENDURANCE_PLANNING_PERSISTED_EVENT, persisted);

    writeEndurancePlanningState(state('Persistée'));

    expect(changed).toHaveBeenCalledTimes(1);
    expect(persisted).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(ENDURANCE_PLANNING_STORAGE_KEY)).not.toBeNull();

    resolvePersist();
    await flushEndurancePlanningPersistence();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persisted).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(ENDURANCE_PLANNING_STORAGE_KEY)).toBeNull();

    window.removeEventListener(ENDURANCE_PLANNING_CHANGED_EVENT, changed);
    window.removeEventListener(ENDURANCE_PLANNING_PERSISTED_EVENT, persisted);
  });

  it('n’émet jamais PERSISTED quand la persistance Dexie échoue', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const persisted = vi.fn();
    hydrateEndurancePlanningRuntime(
      emptyEndurancePlanningState(),
      vi.fn(async () => { throw new Error('dexie-failure'); }),
    );
    window.addEventListener(ENDURANCE_PLANNING_PERSISTED_EVENT, persisted);

    writeEndurancePlanningState(state('Échec'));
    await flushEndurancePlanningPersistence();

    expect(persisted).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(ENDURANCE_PLANNING_STORAGE_KEY)).not.toBeNull();
    expect(errorSpy).toHaveBeenCalled();

    window.removeEventListener(ENDURANCE_PLANNING_PERSISTED_EVENT, persisted);
    errorSpy.mockRestore();
  });
});
