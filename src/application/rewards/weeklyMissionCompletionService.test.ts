import {
  isWeeklyMissionSetComplete,
} from "@/application/rewards/weeklyMissionCompletionService";
import type { WeeklyMissionSnapshot } from "@/application/rewards/weeklyMissionService";

function createSnapshot(
  completedCount: number,
  totalCount: number = 5,
): WeeklyMissionSnapshot {
  return {
    weekStart: "2026-06-22",
    weekEnd: "2026-06-28",
    completedCount,
    totalCount,
    completionPercentage: Math.round(
      (completedCount / totalCount) * 100,
    ),
    missions: [],
  };
}

describe("isWeeklyMissionSetComplete", () => {
  it("valide uniquement une série complète et non vide", () => {
    expect(isWeeklyMissionSetComplete(createSnapshot(5))).toBe(true);
    expect(isWeeklyMissionSetComplete(createSnapshot(4))).toBe(false);
    expect(isWeeklyMissionSetComplete(createSnapshot(0, 0))).toBe(false);
  });
});
