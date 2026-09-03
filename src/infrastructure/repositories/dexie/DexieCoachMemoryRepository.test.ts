import { describe, expect, it } from 'vitest';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieCoachMemoryRepository } from '@/infrastructure/repositories/dexie/DexieCoachMemoryRepository';
import type { NewEntity } from '@/domain/models/common';
import type { CoachDecisionMemoryRecord } from '@/domain/coach/coachMemory';

function memory(): NewEntity<CoachDecisionMemoryRecord> {
  return {
    weeklyReviewId: 'review-1', period: { weekStart: '2026-08-24', weekEnd: '2026-08-30' },
    decisionDate: '2026-08-30', phase: { id: 'deficit', label: 'Déficit actif', objective: 'loss' },
    coachState: 'onTrack', confidence: { weight: 80, food: 80, activity: 80, recovery: 80, overall: 80, level: 'reliable' },
    primaryAction: 'maintainPlan', reasons: ['Progression conforme.'], blockingFactors: [],
    safety: { status: 'clear', reasons: [] }, status: 'maintained', decidedAt: '2026-08-30T12:00:00.000Z',
    nextReview: { type: 'date', date: '2026-09-06' },
  };
}

describe('DexieCoachMemoryRepository', () => {
  it('est idempotent par bilan et trie les décisions récentes en premier', async () => {
    const database = new AppDatabase(`coach-memory-${crypto.randomUUID()}`);
    await database.open();
    try {
      const repository = new DexieCoachMemoryRepository(database);
      const first = await repository.putIfAbsent(memory());
      const retry = await repository.putIfAbsent({ ...memory(), reasons: ['Ne doit pas remplacer.'] });
      const newer = await repository.putIfAbsent({
        ...memory(),
        weeklyReviewId: 'review-2',
        period: { weekStart: '2026-08-31', weekEnd: '2026-09-06' },
        decisionDate: '2026-09-06',
        decidedAt: '2026-09-06T12:00:00.000Z',
        nextReview: { type: 'date', date: '2026-09-13' },
      });
      expect(retry).toEqual(first);
      expect(await database.coachDecisionMemories.count()).toBe(2);
      expect((await repository.listAll()).map(({ id }) => id)).toEqual([
        newer.id,
        first.id,
      ]);
    } finally {
      database.close();
      await database.delete();
    }
  });
});
