import {
  activateVisualTheme,
  applyStoredVisualTheme,
  readVisualThemeState,
  unlockVisualThemes,
  VISUAL_THEME_STORAGE_KEY,
} from "@/domain/rewards/visualThemes";

describe("visualThemes", () => {
  beforeEach(() => {
    window.localStorage.removeItem(VISUAL_THEME_STORAGE_KEY);
    delete document.documentElement.dataset.sportTheme;
  });

  it("conserve le thème classique lorsque le thème demandé est verrouillé", () => {
    expect(activateVisualTheme("power")).toBe(false);
    expect(readVisualThemeState().activeThemeId).toBe("classic");
  });

  it("mémorise puis applique un thème débloqué", () => {
    unlockVisualThemes(["endurance"]);

    expect(activateVisualTheme("endurance")).toBe(true);
    expect(applyStoredVisualTheme()).toBe("endurance");
    expect(document.documentElement.dataset.sportTheme).toBe("endurance");
  });
});
