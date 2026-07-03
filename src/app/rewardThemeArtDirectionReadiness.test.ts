import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import visualThemesSource from '@/domain/rewards/visualThemes.ts?raw';
import themePanelSource from '@/features/settings/components/RewardThemesPanel.tsx?raw';
import desktopSidebarSource from '@/app/layouts/DesktopSidebar.tsx?raw';
import themeCssSource from '@/styles/unlockableThemes.css?raw';

describe('SportPilot 0.24.0 R3d — thèmes colorés statiques', () => {
  it('reste une phase visuelle sans migration ni passage de version finale', () => {
    expect(__APP_VERSION__).toBe('0.23.1');
    expect(databaseSchemaVersion).toBe(8);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(7);
  });

  it('revient à des fonds CSS colorés sans assets image ni mouvement de thème', () => {
    for (const token of [
      'colorful CSS reward themes',
      '--sport-reward-atmosphere',
      '--sport-reward-pattern',
      'background-image: var(--sport-reward-vignette), var(--sport-reward-foreground), var(--sport-reward-atmosphere), var(--sport-reward-pattern)',
      'data-sport-preview="volcan"',
      'data-sport-preview="cosmos"',
      'data-sport-preview="nexus-vivant"',
    ]) {
      expect(themeCssSource).toContain(token);
    }

    expect(themeCssSource).not.toContain('/theme-scenes/');
    expect(themeCssSource).not.toContain('--sport-reward-image');
    expect(themeCssSource).not.toContain('@keyframes');
    expect(themeCssSource).not.toMatch(/animation\s*:/);
  });

  it('garde une direction artistique plus colorée mais non flashy', () => {
    for (const token of [
      'plus coloré',
      'sans asset image ni animation',
      'Volcan',
      'Cosmos',
      'Océan',
      'Abysses',
      'Nexus vivant',
    ]) {
      expect(visualThemesSource).toContain(token);
    }

    expect(visualThemesSource).toContain('dynamic: true');
    expect(themePanelSource).toContain('Ultime');
    expect(themePanelSource).toContain('Prévisualiser');
    expect(themePanelSource).toContain('Quitter l’aperçu');
  });

  it('corrige le grand espace du menu latéral desktop', () => {
    expect(desktopSidebarSource).toContain('className="mt-5 space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800"');
    expect(desktopSidebarSource).not.toContain('className="mt-auto space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800"');
  });
});
