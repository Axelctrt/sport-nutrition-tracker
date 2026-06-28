import {
  ENDURANCE_PLANNING_CHANGED_EVENT,
  ENDURANCE_PLANNING_STORAGE_KEY,
  emptyEndurancePlanningState,
  readEndurancePlanningState,
  writeEndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';

describe('endurancePlanningState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('retourne un état vide si le stockage est absent ou invalide', () => {
    expect(
      readEndurancePlanningState(),
    ).toEqual(emptyEndurancePlanningState());

    window.localStorage.setItem(
      ENDURANCE_PLANNING_STORAGE_KEY,
      '{invalid',
    );

    expect(
      readEndurancePlanningState(),
    ).toEqual(emptyEndurancePlanningState());
  });

  it('conserve les séances et émet un événement', () => {
    const listener = vi.fn();
    window.addEventListener(
      ENDURANCE_PLANNING_CHANGED_EVENT,
      listener,
    );

    writeEndurancePlanningState({
      version: 1,
      sessions: [
        {
          id: 'plan-1',
          title: 'Sortie facile',
          activityType: 'running',
          date: '2026-07-01',
          intensity: 'low',
          targetDurationMinutes: 45,
          status: 'planned',
          createdAt: '2026-06-28T10:00:00.000Z',
          updatedAt: '2026-06-28T10:00:00.000Z',
        },
      ],
    });

    expect(
      readEndurancePlanningState().sessions,
    ).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(
      ENDURANCE_PLANNING_CHANGED_EVENT,
      listener,
    );
  });
});
