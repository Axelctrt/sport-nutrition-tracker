import {
  activateVisualTheme,
  applyStoredVisualTheme,
  readVisualThemeState,
  readVisualThemeStyleMode,
  previewVisualTheme,
  unlockVisualThemes,
  updateVisualThemeStyleMode,
  VISUAL_THEME_STORAGE_KEY,
  VISUAL_THEME_STYLE_STORAGE_KEY,
} from "@/domain/rewards/visualThemes";

describe("visualThemes", () => {
  beforeEach(() => {
    window.localStorage.removeItem(VISUAL_THEME_STORAGE_KEY);
    window.localStorage.removeItem(VISUAL_THEME_STYLE_STORAGE_KEY);
    delete document.documentElement.dataset.sportTheme;
    delete document.documentElement.dataset.sportThemeStyle;
  });

  it("conserve le thème classique lorsque le thème demandé est verrouillé", () => {
    expect(activateVisualTheme("power")).toBe(false);
    expect(readVisualThemeState().activeThemeId).toBe("classic");
  });

  it("prévisualise un thème verrouillé sans le mémoriser", () => {
    previewVisualTheme("volcan");

    expect(document.documentElement.dataset.sportTheme).toBe("volcan");
    expect(document.documentElement.dataset.sportThemeStyle).toBe("full");
    expect(readVisualThemeState().activeThemeId).toBe("classic");
  });

  it("mémorise puis applique un thème débloqué", () => {
    unlockVisualThemes(["endurance"]);

    expect(activateVisualTheme("endurance")).toBe(true);
    expect(applyStoredVisualTheme()).toBe("endurance");
    expect(document.documentElement.dataset.sportTheme).toBe("endurance");
    expect(document.documentElement.dataset.sportThemeStyle).toBe("full");
  });

  it("mémorise le style minimaliste global du thème", () => {
    updateVisualThemeStyleMode("minimal");

    expect(readVisualThemeStyleMode()).toBe("minimal");
    expect(document.documentElement.dataset.sportTheme).toBe("classic");
    expect(document.documentElement.dataset.sportThemeStyle).toBe("minimal");

    unlockVisualThemes(["power"]);
    expect(activateVisualTheme("power")).toBe(true);
    expect(document.documentElement.dataset.sportTheme).toBe("power");
    expect(document.documentElement.dataset.sportThemeStyle).toBe("minimal");
  });
});
