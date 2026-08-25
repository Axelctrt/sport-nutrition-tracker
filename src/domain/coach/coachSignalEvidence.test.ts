import {
  resolveDailyCheckInSignalEvidence,
  resolveDailyCheckOutSignalEvidence,
  resolveReferenceWeightEvidence,
  resolveWeightEntryEvidence,
} from '@/domain/coach/coachSignalEvidence';
import type { DailyCheckIn, DailyCheckOut } from '@/domain/models/dailyCoaching';
import type { WeightEntry } from '@/domain/models/weight';

const metadata = {
  createdAt: '2026-08-25T06:00:00.000Z',
  updatedAt: '2026-08-25T06:00:00.000Z',
};

function weight(provenance?: WeightEntry['provenance']): WeightEntry {
  return {
    id: 'weight:2026-08-25',
    date: '2026-08-25',
    weightKg: 71.2,
    ...(provenance ? { provenance } : {}),
    ...metadata,
  };
}

function checkIn(): DailyCheckIn {
  return {
    id: 'daily-check-in:2026-08-25',
    date: '2026-08-25',
    sleepQuality: 'average',
    readiness: 'high',
    contextFlags: [],
    contextSyncPreference: 'localOnly',
    completedAt: metadata.updatedAt,
    ...metadata,
  };
}

function checkOut(): DailyCheckOut {
  return {
    id: 'daily-check-out:2026-08-25',
    date: '2026-08-25',
    hunger: 'normal',
    energy: 'low',
    foodJournalComplete: true,
    contextFlags: [],
    contextSyncPreference: 'localOnly',
    completedAt: metadata.updatedAt,
    ...metadata,
  };
}

describe('CoachSignalEvidence', () => {
  it.each([
    ['userMeasurement', 'userMeasured', 'confirmed'],
    ['profileInitialization', 'profileInitialization', 'fallback'],
    [undefined, 'legacyUnknown', 'unknown'],
  ] as const)('qualifie la provenance poids %s', (stored, provenance, confidence) => {
    expect(resolveWeightEntryEvidence(weight(stored))).toMatchObject({
      value: 71.2,
      date: '2026-08-25',
      provenance,
      confidence,
    });
  });

  it('distingue un signal subjectif confirmé d’une valeur legacy', () => {
    const legacy = checkIn();
    const confirmed = {
      ...legacy,
      signalProvenance: { sleepQuality: 'userReported' as const },
    };

    expect(resolveDailyCheckInSignalEvidence(legacy, 'sleepQuality')).toMatchObject({
      provenance: 'legacyUnknown',
      confidence: 'unknown',
    });
    expect(resolveDailyCheckInSignalEvidence(confirmed, 'sleepQuality')).toMatchObject({
      provenance: 'userReported',
      confidence: 'confirmed',
    });
  });

  it('ne produit aucune preuve pour un signal absent', () => {
    const withoutReadiness = checkIn();
    delete withoutReadiness.readiness;
    const withoutEnergy = checkOut();
    delete withoutEnergy.energy;

    expect(resolveDailyCheckInSignalEvidence(withoutReadiness, 'readiness'))
      .toBeUndefined();
    expect(resolveDailyCheckOutSignalEvidence(withoutEnergy, 'energy'))
      .toBeUndefined();
  });

  it('qualifie les poids de référence sans changer leur résolution', () => {
    expect(resolveReferenceWeightEvidence('2026-08-25', {
      source: 'previousWeekAverage',
      weightKg: 70.8,
      period: { start: '2026-08-17', end: '2026-08-23' },
      dailyWeights: [],
    })).toMatchObject({ provenance: 'derived', confidence: 'derived' });

    expect(resolveReferenceWeightEvidence('2026-08-25', {
      source: 'profile',
      weightKg: 71,
      period: { start: '2026-08-17', end: '2026-08-23' },
      dailyWeights: [],
    })).toMatchObject({ provenance: 'profileFallback', confidence: 'fallback' });
  });
});
