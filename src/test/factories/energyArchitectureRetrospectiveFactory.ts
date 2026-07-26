import type {
  EnergyArchitectureRetrospectiveReport,
} from '@/domain/calculations/energyArchitectureRetrospective';

export function createEnergyArchitectureRetrospectiveReport(
  overrides: Partial<EnergyArchitectureRetrospectiveReport> = {},
): EnergyArchitectureRetrospectiveReport {
  return {
    version: 1,
    analysisStart: '2026-05-18',
    analysisEnd: '2026-06-14',
    totalDayCount: 28,
    eligibleDayCount: 8,
    excludedDayCount: 20,
    weighInCount: 4,
    validWindowCount: 0,
    exclusionCounts: {
      missingCheckOut: 20,
      incompleteFoodJournal: 20,
      missingFoodData: 20,
      missingLinkedSteps: 20,
      missingDailyTarget: 20,
    },
    excludedDays: [],
    windows: [],
    status: 'insufficientData',
    blockingFactors: [
      'At least 28 complete canonical days are required.',
      'No complete 14-day window has enough distributed weigh-ins.',
    ],
    ...overrides,
  };
}
