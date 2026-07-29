import { visualThemeCatalog } from "@/domain/rewards/visualThemes";
import css from "@/styles/unlockableThemes.css?raw";

describe("rewardThemeSpectacleReadiness", () => {
  it("définit cinq identités visuelles complètes et prévisualisables", () => {
    expect(visualThemeCatalog.map(({ id }) => id)).toEqual([
      "core",
      "neon-pulse",
      "emerald-focus",
      "aurora",
      "zenith-gold",
    ]);
    expect(visualThemeCatalog.map(({ rarity }) => rarity)).toEqual([
      "standard",
      "rare",
      "rare",
      "epic",
      "legendary",
    ]);
    expect(visualThemeCatalog.every(({ palette }) => (
      palette.light.backgroundPrimary !== palette.dark.backgroundPrimary
    ))).toBe(true);
  });

  it("fournit les cinq rendus clair et sombre sans asset distant", () => {
    for (const themeId of visualThemeCatalog.map(({ id }) => id)) {
      expect(css).toContain(`html[data-sport-theme="${themeId}"]`);
      expect(css).toContain(`html.dark[data-sport-theme="${themeId}"]`);
      expect(css).toContain(`[data-theme-preview="${themeId}"]`);
    }
    expect(css).not.toContain("url(http");
    expect(css).not.toContain("/theme-scenes/");
  });

  it("limite le mouvement décoratif à Aurora et respecte reduced-motion", () => {
    expect(css).toContain("@keyframes sp-aurora-background");
    expect(css).toContain('html[data-sport-theme="aurora"] body');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none !important");
  });
});
