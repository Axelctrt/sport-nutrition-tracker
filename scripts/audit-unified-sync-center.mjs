import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'src/features/settings/components/UnifiedSyncCenterPanel.tsx',
  'src/features/settings/components/UnifiedSyncCenterPanel.test.tsx',
  'src/features/settings/components/UnifiedSyncCenterAdvancedDetails.tsx',
  'src/features/settings/components/unifiedSyncCenterModel.ts',
  'src/features/settings/components/unifiedSyncDomainRegistry.ts',
  'src/app/unifiedSyncCenterReadiness.test.ts',
  'src/features/settings/components/SettingsSectionDirectory.tsx',
  'src/features/settings/settingsSectionNavigation.ts',
  'src/app/navigation.tsx',
  'src/app/layouts/DesktopSidebar.tsx',
  'src/app/layouts/DesktopSidebar.test.tsx',
  'src/app/layouts/MobileAppMenu.tsx',
  'src/app/layouts/PageHeader.tsx',
  'src/app/layouts/PageHeader.test.tsx',
  'docs/architecture/unified-sync-center-0.22.0-e3.md',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Fichier E3 absent : ${path}.`);
}

if (failures.length === 0) {
  const syncCenterModel = read(
    'src/features/settings/components/unifiedSyncCenterModel.ts',
  );
  const panel = [
    read('src/features/settings/components/UnifiedSyncCenterPanel.tsx'),
    read('src/features/settings/components/UnifiedSyncCenterAdvancedDetails.tsx'),
    syncCenterModel,
    read('src/features/settings/components/unifiedSyncDomainRegistry.ts'),
  ].join('\n');
  for (const marker of [
    'Centre de synchronisation',
    'Analyser tout',
    'Synchroniser tout',
    'Relancer uniquement les rubriques en échec',
    'Dernière analyse',
    'Dernière synchronisation',
    'Aucune opération cloud n’est lancée hors connexion',
    "target: 'failures'",
    'createSyncPrototypeAccountFingerprint',
    'sportpilot:sync-center:history:',
    "import { revealElement } from '@/shared/motion/revealElement';",
    'revealElement(document.getElementById(detailId), {',
    'Une pesée ou un réglage de calcul peut modifier l’objectif quotidien',
    'onOpenDetail',
    'activeDetailId',
    "activeDetailId === domain.detailId ? 'Masquer' : 'Détail'",
  ]) {
    if (!panel.includes(marker)) fail(`Garde-fou du centre E3 manquant : ${marker}.`);
  }

  if (/behavior\s*:\s*['"]smooth['"]/.test(syncCenterModel)) {
    fail('Le centre E3 ne doit pas forcer un scroll fluide en mouvement réduit.');
  }

  if (panel.includes('href={`#${domain.detailId}`}')) {
    fail('Les détails ne doivent pas utiliser une ancre native avec le HashRouter.');
  }

  for (const marker of [
    'analyzeRealWeights',
    'analyzeRealActivities',
    'analyzeRealGoals',
    'analyzeRealStrength',
    'analyzeRealNutritionJournal',
    'analyzeRealNutritionLibrary',
    'analyzeRealNutritionTracking',
    'analyzeRealAccountPreferences',
    'analyzeRealRewardsRoutines',
  ]) {
    if (!panel.includes(marker)) fail(`Rubrique E3 non orchestrée : ${marker}.`);
  }

  const settingsPage = read('src/features/settings/pages/AdvancedSettingsPage.tsx');
  for (const marker of [
    'id="unified-sync-center"',
    'activeDetailId={selectedSyncDetailId}',
    'onOpenDetail={(detailId) =>',
    'selectedSyncDetailId ? (',
    '<SyncDetailPanel',
    'closeSyncDetail',
    "openSettingsSection('settings-sync')",
    'onClose={closeSyncDetail}',
    "sectionId === 'settings-sync'",
    'sync-detail-account-preferences',
    'sync-detail-rewards-routines',
    'sync-detail-weights',
    'sync-detail-activities',
    'sync-detail-goals',
    'sync-detail-strength',
    'sync-detail-nutrition-journal',
    'sync-detail-nutrition-library',
    'sync-detail-nutrition-tracking',
  ]) {
    if (!settingsPage.includes(marker)) fail(`Navigation détaillée E3 incomplète : ${marker}.`);
  }
  if (settingsPage.includes('aria-label="Détails de synchronisation par rubrique"')) {
    fail('Les neuf panneaux détaillés ne doivent plus être affichés simultanément.');
  }
  if (settingsPage.includes("focusId: 'unified-sync-center'")) {
    fail('Le sommaire doit repositionner l’en-tête Synchronisation des données, pas le sous-bloc État par rubrique.');
  }

  const appNavigation = read('src/app/navigation.tsx');
  for (const marker of [
    "{ label: 'Paramètres', path: routePaths.settings, icon: Settings }",
    "label: 'Sauvegarde'",
    'path: routePaths.backup',
    'icon: DatabaseBackup',
    'end: true',
  ]) {
    if (!appNavigation.includes(marker)) fail(`Correspondance exacte de navigation absente : ${marker}.`);
  }
  const desktopSidebar = read('src/app/layouts/DesktopSidebar.tsx');
  for (const marker of [
    'navigationItemIsActive(location.pathname, item)',
    "aria-current={isActive ? 'page' : undefined}",
  ]) {
    if (!desktopSidebar.includes(marker)) {
      fail(`La navigation de bureau ne délègue pas correctement l’état actif : ${marker}.`);
    }
  }
  const desktopSidebarTests = read('src/app/layouts/DesktopSidebar.test.tsx');
  for (const marker of [
    'conserve les paramètres accessibles dans une zone de navigation défilante',
    'conserve une navigation secondaire courte et laisse Paramètres actif sur ses sous-pages',
  ]) {
    if (!desktopSidebarTests.includes(marker)) {
      fail(`La correspondance exacte de la navigation desktop n’est pas testée : ${marker}.`);
    }
  }

  const mobileMenu = read('src/app/layouts/MobileAppMenu.tsx');
  if (!mobileMenu.includes('end={item.end ?? false}')) {
    fail('Le menu mobile ne respecte pas la correspondance exacte des entrées parentes.');
  }

  const pageHeader = read('src/app/layouts/PageHeader.tsx');
  const settingsHeaderTarget = pageHeader.indexOf('to={routePaths.settings}');
  const settingsHeaderLink = pageHeader.slice(
    pageHeader.lastIndexOf('<Link', settingsHeaderTarget),
    pageHeader.indexOf('</Link>', settingsHeaderTarget),
  );
  if (!settingsHeaderLink.includes('aria-label="Ouvrir les paramètres"')) {
    fail('Le raccourci Paramètres de l’en-tête mobile est absent.');
  }
  if (settingsHeaderLink.includes('aria-current') || settingsHeaderLink.includes('NavLink')) {
    fail('Le raccourci Paramètres de l’en-tête ne doit pas exposer un état actif hors navigation dédiée.');
  }
  const pageHeaderTests = read('src/app/layouts/PageHeader.test.tsx');
  if (!pageHeaderTests.includes('place les paramètres à gauche sur une rubrique principale')) {
    fail('Le raccourci Paramètres de l’en-tête mobile n’est pas couvert par un test dédié.');
  }

  const directory = read('src/features/settings/components/SettingsSectionDirectory.tsx');
  for (const marker of ['onOpenSection', 'focusId', 'openSettingsSection(id, focusId)']) {
    if (!directory.includes(marker)) fail(`Navigation du sommaire E3.2 incomplète : ${marker}.`);
  }

  const navigation = read('src/features/settings/settingsSectionNavigation.ts');
  for (const marker of ['focusId = sectionId', 'scrollToSettingsSection(focusId)']) {
    if (!navigation.includes(marker)) fail(`Ciblage du centre E3.2 incomplet : ${marker}.`);
  }

  const packageJson = JSON.parse(read('package.json'));
  if (
    packageJson.scripts?.['audit:unified-sync-center'] !==
    'node scripts/audit-unified-sync-center.mjs'
  ) {
    fail('Le script audit:unified-sync-center est absent ou incohérent.');
  }
  for (const pipeline of ['check', 'ci']) {
    if (!String(packageJson.scripts?.[pipeline] ?? '').includes('audit:unified-sync-center')) {
      fail(`Le pipeline ${pipeline} n’exécute pas l’audit E3.`);
    }
  }

  const versions = read('src/infrastructure/database/migrations/versions.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_13\b/.test(versions)) {
    fail('La base métier doit utiliser Dexie v13.');
  }
  const backup = read('src/infrastructure/backup/backupMigrations.ts');
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*12\b/.test(backup)) {
    fail('La sauvegarde JSON doit utiliser la v12.');
  }
  const cloud = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  if (!cloud.includes('SYNC_PROTOTYPE_DATABASE_VERSION = 18')) {
    fail('Le runtime cloud doit utiliser la v17 pour les amitiés, permissions sociales et le journal Goals.');
  }
}

if (failures.length > 0) {
  console.error('Audit E3 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit E3 réussi : pilotage global, retour UX vers la rubrique, sélection de navigation unique, détail à la demande, reprise ciblée des échecs, historique isolé par compte et runtime cloud v18 social prêt.',
);
