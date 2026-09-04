import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isStableVersionAtLeast } from './shared/stableVersion.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'RELEASE-NOTES-0.35.0.md',
  'RELEASE-NOTES-0.35.1.md',
  'RELEASE-NOTES-0.36.0.md',
  'RELEASE-NOTES-0.37.0.md',
  'RELEASE-NOTES-1.0.0.md',
  'RELEASE-NOTES-1.0.0-rc.1.md',
  'RELEASE-NOTES-1.0.0-rc.2.md',
  'RELEASE-NOTES-1.0.1.md',
  'RELEASE-NOTES-1.0.2.md',
  'RELEASE-NOTES-1.0.3.md',
  'RELEASE-NOTES-1.0.4.md',
  'CHANGELOG.md',
  'RELEASE-CHECKLIST.md',
  'KNOWN-LIMITATIONS.md',
  'docs/onboarding-compact-0.32.0.md',
  'e2e/onboarding-compact.spec.ts',
  'e2e/nutrition-add-flow.spec.ts',
  'e2e/helpers/performanceGlass.ts',
  'e2e/performance-glass-0.34.0.spec.ts',
  'scripts/shared/stableVersion.mjs',
  'scripts/audit-unified-sync-center.mjs',
  'scripts/audit-automatic-sync-release.mjs',
  'scripts/audit-reward-theme-catalog.mjs',
  'scripts/audit-social-friend-removal-0.29.0.mjs',
  'scripts/audit-photo-ai.mjs',
  'src/app/releaseReadiness.test.ts',
  'src/app/socialReleaseFinalizationReadiness.test.ts',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`fichier de consolidation absent : ${path}.`);
}

if (failures.length === 0) {
  const packageJson = JSON.parse(read('package.json'));
  const packageLock = JSON.parse(read('package-lock.json'));
  if (packageJson.version !== '1.0.4') {
    fail(`package.json doit préparer 1.0.4, reçu ${packageJson.version}.`);
  }
  if (packageLock.version !== packageJson.version || packageLock.packages?.['']?.version !== packageJson.version) {
    fail(`package-lock.json doit être aligné sur ${packageJson.version}.`);
  }
  if (!isStableVersionAtLeast(packageJson.version, 20)) {
    fail('la version courante doit être reconnue comme compatible par le garde-fou partagé.');
  }

  const scripts = packageJson.scripts ?? {};
  if (scripts['audit:release-consolidation'] !== 'node scripts/audit-release-consolidation.mjs') {
    fail('le script audit:release-consolidation est absent ou incohérent.');
  }
  for (const pipeline of ['check', 'ci']) {
    if (!String(scripts[pipeline] ?? '').includes('audit:release-consolidation')) {
      fail(`le pipeline ${pipeline} ne lance pas l’audit de consolidation.`);
    }
  }

  const productionAudit = read('scripts/audit-rc.mjs');
  const automaticSyncAudit = read('scripts/audit-automatic-sync-release.mjs');
  const rewardAudit = read('scripts/audit-reward-theme-catalog.mjs');
  for (const [label, source] of [
    ['production', productionAudit],
    ['synchronisation automatique', automaticSyncAudit],
    ['récompenses', rewardAudit],
  ]) {
    if (!source.includes('3584 * 1024')) fail(`le budget JavaScript ${label} n’est pas aligné sur 3584 Kio.`);
  }

  const releaseNotes = read('RELEASE-NOTES-1.0.4.md');
  for (const marker of [
    'SportPilot 1.0.4 — continuité Activities + Goals both',
    'Branche : `release/1.0.4`',
    'develop@01d317dd62ddbbdc77002add1ccb7411d08049a2',
    'Strength',
    'Goals',
    'Weights',
    'Activities',
    '`local-only`',
    '`cloud-only`',
    '`both`',
    '`unknown`',
    'Dexie v13',
    'sauvegarde JSON v12',
    'runtime Dexie Cloud v18',
    'aucune migration D1',
    'aucune modification des formules calories/macros',
    'aucun changement de thème validé',
    'aucun élargissement IA',
    'Toute différence fonctionnelle',
  ]) {
    if (!releaseNotes.includes(marker)) fail(`notes de release 1.0.4 incomplètes : ${marker}.`);
  }

  const acceptedRc2Notes = read('RELEASE-NOTES-1.0.0-rc.2.md');
  for (const marker of [
    'SportPilot 1.0.0-rc.2',
    'Branche : `codex/rc-1-0-0-rc2`',
    'cold launch PWA',
    '**/analytics*.js',
    'AnalyticsPage-*',
    '6 796 octets',
    '#141',
    '#146',
  ]) {
    if (!acceptedRc2Notes.includes(marker)) fail(`archive RC2 incomplète : ${marker}.`);
  }

  const rejectedRc1Notes = read('RELEASE-NOTES-1.0.0-rc.1.md');
  for (const marker of [
    'SportPilot 1.0.0-rc.1',
    '2fd781087a65e125b0e77edcd53d41fdf82922ed',
    '64efefef-d4c5-4f6a-a98e-c04ca65bc0da',
    'REJETÉE',
    '#144',
    '#145',
    'Aucune seconde Preview RC1',
  ]) {
    if (!rejectedRc1Notes.includes(marker)) fail(`archive RC1 incomplète : ${marker}.`);
  }

  const stableReleaseNotes = read('RELEASE-NOTES-0.37.0.md');
  for (const marker of ['SportPilot 0.37.0', 'Branche : `release/0.37.0`', 'Aucun tag ni déploiement']) {
    if (!stableReleaseNotes.includes(marker)) fail(`archive 0.37.0 incomplète : ${marker}.`);
  }

  const checklist = read('RELEASE-CHECKLIST.md');
  for (const marker of [
    'SportPilot 1.0.4',
    'Archive RC1 — rejetée',
    '#146',
    '#162',
    'Aucun tag créé',
    'Suite Vitest complète',
    'Build PWA',
    'Playwright WebKit iPhone 15',
  ]) {
    if (!checklist.includes(marker)) fail(`checklist de publication incomplète : ${marker}.`);
  }

  const knownLimitations = read('KNOWN-LIMITATIONS.md');
  for (const marker of ['SportPilot 1.0.4', '#103', '#136', '#137', '#138', '#141', '#146', '#162', '2 HIGH / 0 CRITICAL', 'Dépendances']) {
    if (!knownLimitations.includes(marker)) fail(`limitations connues incomplètes : ${marker}.`);
  }

  const onboardingDocumentation = read('docs/onboarding-compact-0.32.0.md');
  for (const marker of [
    'scrollSensitivity={1}',
    'sensibilité par défaut est légèrement amplifiée à 1,15',
    'le conteneur principal entier utilise `overflow-y: auto`',
  ]) {
    if (!onboardingDocumentation.includes(marker)) fail(`documentation onboarding incomplète : ${marker}.`);
  }

  const accountChoice = read('src/features/onboarding/components/OnboardingAccountChoice.tsx');
  for (const marker of ['Connecter un compte', 'Paramètres → Compte et appareils']) {
    if (!accountChoice.includes(marker)) fail(`choix de compte onboarding incomplet : ${marker}.`);
  }

  const nutritionFlow = read('e2e/nutrition-add-flow.spec.ts');
  for (const marker of [
    'active la recherche',
    "browserName === 'webkit'",
    'new RegExp(`#\\\\/food\\\\/select\\\\?date=${date}&slot=lunch$`)',
  ]) {
    if (!nutritionFlow.includes(marker)) fail(`recette Nutrition incomplète : ${marker}.`);
  }

  const performanceGlass = read('e2e/performance-glass-0.34.0.spec.ts');
  for (const marker of [
    'async function prepareVisualApplication(',
    'await page.goto(`/visual-lab.html${bootstrapSearch}`',
    "await expect(page.locator('#root')).not.toBeEmpty();",
    'await setup(page);',
    'await page.goto(targetUrl, { waitUntil: \'domcontentloaded\' });',
    'async function prepareSeededVisualTheme(',
    'await seedPerformanceGlassData(setupPage);',
    'await setVisualThemeState(setupPage, options);',
    'async function enableDarkMode(page: Page)',
    "name: /Thème clair.*Thème sombre/",
    "test('active le thème sombre core via le contrôle accessible'",
    "appearance: 'light'",
    'await enableDarkMode(page);',
    "reducedMotion: 'reduce'",
    "page.getByRole('dialog', { name: 'Tout est prêt' })",
    "page.locator('.sp-badge-reveal-backdrop')",
  ]) {
    if (!performanceGlass.includes(marker)) {
      fail(`le harnais Performance Glass doit conserver son cycle navigateur contrôlé : ${marker}.`);
    }
  }

  const performanceGlassHelper = read('e2e/helpers/performanceGlass.ts');
  for (const marker of [
    "import { achievementCatalog } from '../../src/domain/rewards/achievements';",
    'achievementCatalog.map(({ id }) => id)',
    'const earnedAchievements = seededAchievementIds.map((id) => ({',
    'earnedAchievements,',
    'const readPersistedAppearance = () => page.evaluate(async ({',
    'persistedAppearance.localAppearance !== appearance',
    'persistedAppearance.deviceAppearance !== appearance',
    'deviceAppearance: appearance,',
  ]) {
    if (!performanceGlassHelper.includes(marker)) {
      fail(`le seed Performance Glass doit neutraliser les reveals hors périmètre : ${marker}.`);
    }
  }

  const versions = read('src/infrastructure/database/migrations/versions.ts');
  const backup = read('src/infrastructure/backup/backupMigrations.ts');
  const cloud = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_13\b/.test(versions)) fail('Dexie doit utiliser la v13.');
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*12\b/.test(backup)) fail('la sauvegarde JSON doit utiliser la v12.');
  if (!cloud.includes('SYNC_PROTOTYPE_DATABASE_VERSION = 18')) fail('le runtime cloud doit utiliser la v18.');
}

if (failures.length > 0) {
  console.error('Audit de consolidation 1.0.4 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit de consolidation 1.0.4 réussi : continuité Activities + Goals both, archives stables/RC, documentation, budgets, parcours et contrats de stockage sont alignés.');
