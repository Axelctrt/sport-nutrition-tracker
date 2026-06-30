import {
  ACHIEVEMENT_STORAGE_KEY,
  readAchievementState,
  unlockAchievements,
} from "@/domain/rewards/achievements";

describe("achievements", () => {
  beforeEach(() => {
    window.localStorage.removeItem(ACHIEVEMENT_STORAGE_KEY);
  });

  it("retourne un état vide lorsque le stockage est invalide", () => {
    window.localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, "{invalide");

    expect(readAchievementState()).toEqual({ earnedAchievements: [] });
  });

  it("mémorise un badge une seule fois avec sa date d’obtention", () => {
    unlockAchievements(["first-session"], "2026-06-27T12:00:00.000Z");
    unlockAchievements(["first-session"], "2026-06-28T12:00:00.000Z");

    expect(readAchievementState()).toEqual({
      earnedAchievements: [
        {
          id: "first-session",
          earnedAt: "2026-06-27T12:00:00.000Z",
        },
      ],
    });
  });
});
