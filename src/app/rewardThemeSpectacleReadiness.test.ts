import { visualThemeCatalog } from "@/domain/rewards/visualThemes";
import css from "@/styles/unlockableThemes.css?raw";

describe("rewardThemeSpectacleReadiness", () => {
  it("documente le retour à des thèmes colorés statiques et plus sobres", () => {
    const byId = new Map(
      visualThemeCatalog.map((theme) => [theme.id, theme]),
    );

    expect(byId.get("volcan")?.description).toContain("lave suggérée");
    expect(byId.get("volcan")?.description).toContain("sans image lourde ni mouvement");
    expect(byId.get("ocean")?.description).toContain("bleu-turquoise plus coloré");
    expect(byId.get("abysses")?.description).toContain("sans animation");
    expect(byId.get("cosmos")?.description).toContain("sci-fi sans animation");
    expect(byId.get("nexus-vivant")?.description).toContain("sans animation ni asset image");
  });

  it("ne dépend plus d’images publiques ni d’animations de thème", () => {
    expect(css).toContain("colorful CSS reward themes");
    expect(css).toContain("--sport-reward-atmosphere");
    expect(css).toContain("--sport-reward-pattern");
    expect(css).not.toContain("/theme-scenes/");
    expect(css).not.toContain("--sport-preview-image");
    expect(css).not.toContain("@keyframes");
    expect(css).not.toMatch(/animation\s*:/);
  });

  it("conserve des miniatures vitrines sans assets externes", () => {
    for (const themeId of [
      "ocean",
      "abysses",
      "volcan",
      "canopee",
      "cosmos",
      "forge",
      "nexus-vivant",
    ]) {
      expect(css).toContain(`data-sport-preview=\"${themeId}\"`);
    }
  });
});
