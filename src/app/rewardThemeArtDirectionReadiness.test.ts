import { CURRENT_BACKUP_SCHEMA_VERSION } from "@/infrastructure/backup/backupMigrations";
import { databaseSchemaVersion } from "@/infrastructure/database/schema";
import visualThemesSource from "@/domain/rewards/visualThemes.ts?raw";
import themePanelSource from "@/features/settings/components/RewardThemesPanel.tsx?raw";
import desktopSidebarSource from "@/app/layouts/DesktopSidebar.tsx?raw";
import appLayoutSource from "@/app/layouts/AppLayout.tsx?raw";
import themeCssSource from "@/styles/unlockableThemes.css?raw";

describe("SportPilot 0.25.1 R4.5 — pop-up unique, complet supprimé et sombre stabilisé", () => {
  it("reste une phase visuelle sans migration ni passage de version finale", () => {
    expect(__APP_VERSION__).toBe("0.25.1");
    expect(databaseSchemaVersion).toBe(8);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(7);
  });

  it("revient à des fonds CSS colorés sans assets image ni mouvement de thème", () => {
    for (const token of [
      "accessible dark-mode fixes",
      "--sport-reward-atmosphere",
      "--sport-reward-pattern",
      'data-sport-theme-style="minimal"',
      "sport-theme-app",
      "--sport-reward-base",
      'data-sport-preview="volcan"',
      'data-sport-preview="cosmos"',
      'data-sport-preview="nexus-vivant"',
    ]) {
      expect(themeCssSource).toContain(token);
    }

    expect(themeCssSource).not.toContain("/theme-scenes/");
    expect(themeCssSource).toContain("data-theme-preview-dialog");
    expect(themeCssSource).toContain('html.dark[data-sport-theme]:not([data-sport-theme="classic"])');
    expect(themeCssSource).not.toContain("--sport-reward-image");
    expect(themeCssSource).not.toContain("@keyframes");
    expect(themeCssSource).not.toMatch(/animation\s*:/);
  });

  it("garde une direction artistique plus colorée mais non flashy", () => {
    for (const token of [
      "plus coloré",
      "sans asset image ni animation",
      "Volcan",
      "Cosmos",
      "Océan",
      "Abysses",
      "Nexus vivant",
    ]) {
      expect(visualThemesSource).toContain(token);
    }

    expect(visualThemesSource).toContain("dynamic: true");
    expect(themePanelSource).toContain("Ultime");
    expect(themePanelSource).toContain("Voir un aperçu rapide de");
    expect(themePanelSource).not.toContain("Prévisualiser tout");
    expect(themePanelSource).not.toContain("Aperçu complet temporaire");
    expect(themePanelSource).toContain("data-theme-preview-dialog");
    expect(themePanelSource).toContain("SportPilot classique n’a pas d’aperçu complet");
    expect(themePanelSource).toContain("Minimaliste uniquement");
    expect(themePanelSource).toContain("Style du thème");
    expect(themePanelSource).toContain("Minimaliste");
    expect(themePanelSource).toContain("updateVisualThemeStyleMode");
    expect(themePanelSource).toContain('role="dialog"');
    expect(themePanelSource).toContain("data-theme-quick-preview");
    expect(themePanelSource).not.toContain("Quitter l’aperçu");
    expect(themePanelSource).toContain("createPortal");
    expect(themePanelSource).toContain("data-theme-preview-backdrop");
    expect(themePanelSource).not.toContain("Aperçu actif persistant");
    expect(visualThemesSource).toContain("VisualThemeStyleMode");
    expect(visualThemesSource).toContain("styleMode");
  });

  it("corrige le grand espace du menu latéral desktop", () => {
    expect(desktopSidebarSource).toContain(
      'className="mt-5 space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800"',
    );
    expect(desktopSidebarSource).not.toContain(
      'className="mt-auto space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800"',
    );
    expect(appLayoutSource).toContain("sport-theme-app");
  });
});
