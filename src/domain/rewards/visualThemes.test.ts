import {
  activateVisualTheme,
  applyStoredVisualTheme,
  beginVisualThemeTrial,
  cancelVisualThemeTrial,
  confirmVisualThemeTrial,
  emptyVisualThemeState,
  markVisualThemeRevealSeen,
  parseVisualThemeState,
  readVisualThemeState,
  resetVisualThemeStateRuntimeForTests,
  unlockVisualThemes,
  VISUAL_THEME_BOOT_STORAGE_KEY,
  VISUAL_THEME_STORAGE_KEY,
  visualThemeCatalog,
  writeVisualThemeState,
} from "@/domain/rewards/visualThemes";

describe("visualThemes", () => {
  beforeEach(() => {
    resetVisualThemeStateRuntimeForTests();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-sport-theme");
  });

  it("expose exactement les cinq thèmes 0.34.0 avec leurs palettes clair et sombre", () => {
    expect(visualThemeCatalog.map(({ id }) => id)).toEqual([
      "core",
      "neon-pulse",
      "emerald-focus",
      "aurora",
      "zenith-gold",
    ]);
    expect(
      visualThemeCatalog.every(({ palette }) => (
        palette.light.chart.length === 5 && palette.dark.chart.length === 5
      )),
    ).toBe(true);
  });

  it("convertit un ancien état de thème inconnu vers Core sans conserver ses identifiants", () => {
    expect(parseVisualThemeState({
      activeThemeId: "power",
      unlockedThemeIds: ["classic", "power"],
    })).toEqual(emptyVisualThemeState());
  });

  it("refuse d'activer un thème verrouillé", () => {
    expect(activateVisualTheme("zenith-gold")).toBe(false);
    expect(readVisualThemeState().activeThemeId).toBe("core");
  });

  it("débloque un thème une seule fois et conserve ses métadonnées", () => {
    const unlockedAt = "2026-07-20T08:00:00.000Z";
    const revealSeenAt = "2026-07-21T09:30:00.000Z";

    unlockVisualThemes(["neon-pulse"], unlockedAt);
    unlockVisualThemes(["neon-pulse"], "2026-07-22T08:00:00.000Z");
    markVisualThemeRevealSeen("neon-pulse", revealSeenAt);

    expect(readVisualThemeState()).toMatchObject({
      activeThemeId: "core",
      unlockedThemeIds: ["core", "neon-pulse"],
      unlockMetadata: {
        "neon-pulse": { unlockedAt, revealSeenAt },
      },
    });
  });

  it("applique et mémorise un thème débloqué", () => {
    unlockVisualThemes(["emerald-focus"]);

    expect(activateVisualTheme("emerald-focus")).toBe(true);
    expect(applyStoredVisualTheme()).toBe("emerald-focus");
    expect(document.documentElement.dataset.sportTheme).toBe("emerald-focus");
    expect(window.localStorage.getItem(VISUAL_THEME_BOOT_STORAGE_KEY)).toBe(
      "emerald-focus",
    );
  });

  it("essaie un thème sans modifier la préférence persistée puis peut annuler", () => {
    unlockVisualThemes(["aurora"]);
    writeVisualThemeState({
      ...readVisualThemeState(),
      activeThemeId: "core",
    });

    expect(beginVisualThemeTrial("aurora")).toBe(true);
    expect(document.documentElement.dataset.sportTheme).toBe("aurora");
    expect(readVisualThemeState().activeThemeId).toBe("core");

    expect(cancelVisualThemeTrial()).toBe("core");
    expect(document.documentElement.dataset.sportTheme).toBe("core");
    expect(readVisualThemeState().activeThemeId).toBe("core");
  });

  it("ne persiste l'essai qu'après confirmation et revient à l'ancien thème au rechargement", () => {
    unlockVisualThemes(["zenith-gold"]);
    beginVisualThemeTrial("zenith-gold");

    resetVisualThemeStateRuntimeForTests();
    expect(applyStoredVisualTheme()).toBe("core");

    beginVisualThemeTrial("zenith-gold");
    expect(confirmVisualThemeTrial()).toBe(true);
    expect(readVisualThemeState().activeThemeId).toBe("zenith-gold");
    expect(JSON.parse(
      window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY) ?? "{}",
    )).toMatchObject({ activeThemeId: "zenith-gold" });
  });
});
