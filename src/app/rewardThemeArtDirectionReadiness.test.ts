import { CURRENT_BACKUP_SCHEMA_VERSION } from "@/infrastructure/backup/backupMigrations";
import { databaseSchemaVersion } from "@/infrastructure/database/schema";
import visualThemesSource from "@/domain/rewards/visualThemes.ts?raw";
import themePanelSource from "@/features/settings/components/RewardThemesPanel.tsx?raw";
import desktopSidebarSource from "@/app/layouts/DesktopSidebar.tsx?raw";
import appLayoutSource from "@/app/layouts/AppLayout.tsx?raw";
import themeCssSource from "@/styles/unlockableThemes.css?raw";

describe("SportPilot 0.35.1 - thèmes Performance Glass", () => {
  it("préserve les versions de données pendant la phase visuelle", () => {
    expect(__APP_VERSION__).toBe("0.35.1");
    expect(databaseSchemaVersion).toBe(11);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
  });

  it("sépare l'apparence claire/sombre des cinq identités", () => {
    for (const themeId of [
      "core",
      "neon-pulse",
      "emerald-focus",
      "aurora",
      "zenith-gold",
    ]) {
      expect(themeCssSource).toContain(`data-sport-theme="${themeId}"`);
      expect(themeCssSource).toContain(`data-theme-preview="${themeId}"`);
      expect(visualThemesSource).toContain(`id: "${themeId}"`);
    }
    expect(themeCssSource).toContain("prefers-reduced-motion: reduce");
    expect(themeCssSource).not.toContain("data-sport-theme-style");
    expect(visualThemesSource).not.toContain("VisualThemeStyleMode");
  });

  it("propose une collection, une progression et un essai confirmé", () => {
    expect(themePanelSource).toContain("Ma collection");
    expect(themePanelSource).toContain("ThemeCriteria");
    expect(themePanelSource).toContain("beginVisualThemeTrial");
    expect(themePanelSource).toContain("confirmVisualThemeTrial");
    expect(themePanelSource).toContain("Revenir à l’ancien thème");
    expect(themePanelSource).toContain("data-theme-preview");
  });

  it("applique les tokens Performance Glass à la structure principale", () => {
    expect(desktopSidebarSource).toContain("sp-navigation-shell");
    expect(desktopSidebarSource).toContain("sp-navigation-link");
    expect(desktopSidebarSource).toContain("var(--sp-border-subtle)");
    expect(appLayoutSource).toContain("sport-theme-app");
    expect(appLayoutSource).toContain("var(--sp-text-primary)");
  });
});
