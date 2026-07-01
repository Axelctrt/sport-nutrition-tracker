import { deleteGoal } from '@/application/goals/goalProgressService';
import type { Goal } from '@/domain/goals/goalState';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { initializeUserStateRuntime } from '@/infrastructure/user-state/userStateRuntime';

function goal(): Goal {
  return {
    id: 'goal-delete-sync',
    title: 'Objectif à supprimer',
    metric: 'totalSteps',
    targetValue: 100_000,
    startDate: '2026-07-01',
    status: 'active',
    reachedMilestones: [],
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  };
}

describe('préparation des suppressions d’objectifs à la synchronisation', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = new AppDatabase(`sportpilot-goal-delete-${crypto.randomUUID()}`);
    await database.open();
    await database.goals.add(goal());
    await initializeUserStateRuntime(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('supprime l’objectif et crée un marqueur durable', async () => {
    await deleteGoal('goal-delete-sync', database);

    expect(await database.goals.get('goal-delete-sync')).toBeUndefined();
    expect(
      await database.deletionRecords.get('deletion:goal:goal-delete-sync'),
    ).toMatchObject({
      entityType: 'goal',
      entityId: 'goal-delete-sync',
      status: 'deleted',
    });
  });
});
