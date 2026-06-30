import {
  ENDURANCE_PLANNING_STORAGE_KEY,
  emptyEndurancePlanningState,
  writeEndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import {
  readRewardBackupState,
  restoreRewardBackupState,
} from '@/infrastructure/backup/rewardBackupState';

describe('sauvegarde du planning d’endurance', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('inclut le planning dans l’état local sauvegardé', () => {
    writeEndurancePlanningState({
      version: 1,
      sessions: [
        {
          id: 'plan-1',
          title: 'Footing',
          activityType: 'running',
          date: '2026-07-01',
          intensity: 'low',
          status: 'planned',
          createdAt: '2026-06-28T10:00:00.000Z',
          updatedAt: '2026-06-28T10:00:00.000Z',
        },
      ],
    });

    expect(
      readRewardBackupState()
        .endurancePlanning?.sessions,
    ).toHaveLength(1);
  });

  it('restaure le planning sans casser les anciennes sauvegardes', async () => {
    const baseState = readRewardBackupState();

    writeEndurancePlanningState({
      version: 1,
      sessions: [
        {
          id: 'current',
          title: 'Séance actuelle',
          activityType: 'cycling',
          date: '2026-07-02',
          intensity: 'moderate',
          status: 'planned',
          createdAt: '2026-06-28T10:00:00.000Z',
          updatedAt: '2026-06-28T10:00:00.000Z',
        },
      ],
    });

    const legacyState = { ...baseState };
    delete legacyState.endurancePlanning;

    await restoreRewardBackupState(legacyState);

    expect(
      JSON.parse(
        window.localStorage.getItem(
          ENDURANCE_PLANNING_STORAGE_KEY,
        ) ?? '{}',
      ).sessions,
    ).toHaveLength(1);

    await restoreRewardBackupState({
      ...baseState,
      endurancePlanning:
        emptyEndurancePlanningState(),
    });

    expect(
      JSON.parse(
        window.localStorage.getItem(
          ENDURANCE_PLANNING_STORAGE_KEY,
        ) ?? '{}',
      ),
    ).toEqual(emptyEndurancePlanningState());
  });
});
