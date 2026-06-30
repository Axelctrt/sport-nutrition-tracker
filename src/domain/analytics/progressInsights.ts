import type { EnduranceRecords } from '@/domain/calculations/endurance';
import type { LocalDate } from '@/domain/models/common';

export interface DisciplineAdherence {
  plannedCount: number;
  completedCount: number;
  skippedCount: number;
  pendingCount: number;
  adherencePercent?: number;
}

export interface PlanningAdherenceWeek {
  weekStart: LocalDate;
  weekEnd: LocalDate;
  label: string;
  plannedCount: number;
  completedCount: number;
  skippedCount: number;
  pendingCount: number;
  adherencePercent?: number;
  strength: DisciplineAdherence;
  endurance: DisciplineAdherence;
  recordedActivityCount: number;
  isClosed: boolean;
}

export interface AdherenceTrend {
  recentPercent?: number;
  previousPercent?: number;
  deltaPoints?: number;
  recentWeekCount: number;
  previousWeekCount: number;
}

export interface ConsistencyRecords {
  currentActiveWeekStreak: number;
  bestActiveWeekStreak: number;
  currentPerfectPlanningStreak: number;
  bestPerfectPlanningStreak: number;
  bestAdherenceWeek?: PlanningAdherenceWeek;
}

export interface ProgressInsights {
  weeks: PlanningAdherenceWeek[];
  overall: DisciplineAdherence;
  trend: AdherenceTrend;
  consistency: ConsistencyRecords;
  personalRecords: EnduranceRecords;
}
