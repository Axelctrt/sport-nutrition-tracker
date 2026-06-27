import type { ActivityType } from '@/domain/models/activity';
import type { EnduranceRecords } from '@/domain/calculations/endurance';
import type { LocalDate } from '@/domain/models/common';

export interface CalendarWeek {
  weekStart: LocalDate;
  weekEnd: LocalDate;
  label: string;
}

export interface RunningWeekSummary extends CalendarWeek {
  distanceKm: number;
  durationMinutes: number;
  weightedPaceSecondsPerKm?: number;
  sessionCount: number;
  longestDistanceKm: number;
}

export interface SwimmingWeekSummary extends CalendarWeek {
  distanceMeters: number;
  durationMinutes: number;
  weightedPaceSecondsPer100m?: number;
  sessionCount: number;
  longestDistanceMeters: number;
}

export interface CyclingWeekSummary extends CalendarWeek {
  distanceKm: number;
  durationMinutes: number;
  weightedSpeedKmh?: number;
  elevationGainMeters: number;
  sessionCount: number;
  longestDistanceKm: number;
}

export interface NutritionWeekSummary extends CalendarWeek {
  trackedDayCount: number;
  completedDayCount: number;
  averageConsumedCaloriesKcal?: number;
  averageTargetCaloriesKcal?: number;
  averageConsumedProteinGrams?: number;
  averageTargetProteinGrams?: number;
  calorieAdherencePercent?: number;
  proteinAdherencePercent?: number;
}

export interface ActivityTimeBreakdown {
  type: ActivityType;
  durationMinutes: number;
  sessionCount: number;
}

export interface ActivityWeekSummary extends CalendarWeek {
  averageSteps?: number;
  recordedStepDays: number;
  totalSportMinutes: number;
  sessionCount: number;
  breakdown: ActivityTimeBreakdown[];
}

export interface WeightMovingAveragePoint {
  date: LocalDate;
  weightKg: number;
  movingAverageKg: number;
  targetWeightKg: number;
  sampleCount: number;
}

export interface WeightWeekSummary extends CalendarWeek {
  averageWeightKg?: number;
  weighInCount: number;
  targetWeightKg: number;
}

export interface TwelveWeekAnalytics {
  from: LocalDate;
  to: LocalDate;
  running: RunningWeekSummary[];
  swimming: SwimmingWeekSummary[];
  cycling: CyclingWeekSummary[];
  enduranceRecords: EnduranceRecords;
  nutrition: NutritionWeekSummary[];
  activity: ActivityWeekSummary[];
  weight: {
    movingAverage: WeightMovingAveragePoint[];
    weekly: WeightWeekSummary[];
  };
  activityBreakdown: ActivityTimeBreakdown[];
}

export interface HistoryDaySummary {
  date: LocalDate;
  weightKg?: number;
  totalSteps?: number;
  activityCount: number;
  sportMinutes: number;
  estimatedActivityCaloriesKcal: number;
  consumedCaloriesKcal?: number;
  targetCaloriesKcal?: number;
  consumedProteinGrams?: number;
  targetProteinGrams?: number;
  journalComplete: boolean;
}
