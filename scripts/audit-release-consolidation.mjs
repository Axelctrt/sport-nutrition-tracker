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
  'RELEASE-CHECKLIST.md',
  'KNOWN-LIMITATIONS.md',
  'docs/onboarding-compact-0.32.0.md',
  'e2e/onboarding-compact.spec.ts',
  'e2e/nutrition-add-flow.spec.ts',
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
  if (packageJson.version !== '0.36.0') fail(`package.json doit publier 0.36.0, reçu ${packageJson.version}.`);
  if (packageLock.version !== '0.36.0' || packageLock.packages?.['']?.version !== '0.36.0') {
    fail('package-lock.json doit être aligné sur 0.36.0.');
  }
  if (!isStableVersionAtLeast(packageJson.version, 20)) {
    fail('la version courante doit être reconnue comme stable par le garde-fou partagé.');
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
    if (!source.includes('3408 * 1024')) fail(`le budget JavaScript ${label} n’est pas aligné sur 3408 Kio.`);
  }

  const releaseNotes = read('RELEASE-NOTES-0.36.0.md');
  for (const marker of [
    'SportPilot 0.36.0',
    'Branche : `feat/friends-settings-strength-ux-0.36.0`',
    'Aucun tag ni déploiement',
    'quatre rubriques explicites',
    'cinq catégories',
    'autosauvegarde fiable',
    'aucune migration Dexie ou D1',
  ]) {
    if (!releaseNotes.includes(marker)) fail(`notes de release incomplètes : ${marker}.`);
  }

  const checklist = read('RELEASE-CHECKLIST.md');
  for (const marker of [
    'Branche `feat/friends-settings-strength-ux-0.36.0` créée',
    'Aucun tag créé',
    'Suite Vitest complète',
    'Build PWA',
    'Playwright WebKit iPhone 15',
  ]) {
    if (!checklist.includes(marker)) fail(`checklist de publication incomplète : ${marker}.`);
  }

  const knownLimitations = read('KNOWN-LIMITATIONS.md');
  for (const marker of ['SportPilot 0.36.0', 'Moteur calorique', 'Dépendances']) {
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
    'async function prepareVisualTheme(',
    "page.goto('/visual-lab.html'",
    "page.locator('#root')",
    'await setVisualThemeState(page, options);',
  ]) {
    if (!performanceGlass.includes(marker)) {
      fail(`le harnais Performance Glass doit isoler les écritures IndexedDB : ${marker}.`);
    }
  }

  const versions = read('src/infrastructure/database/migrations/versions.ts');
  const backup = read('src/infrastructure/backup/backupMigrations.ts');
  const cloud = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_12\b/.test(versions)) fail('Dexie doit utiliser la v12.');
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*10\b/.test(backup)) fail('la sauvegarde JSON doit rester en v10.');
  if (!cloud.includes('SYNC_PROTOTYPE_DATABASE_VERSION = 16')) fail('le runtime cloud doit utiliser la v16.');
}

if (failures.length > 0) {
  console.error('Audit de consolidation 0.36.0 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit de consolidation 0.36.0 réussi : version, documentation, budgets, parcours et contrats de stockage sont alignés.');
