import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isStableVersionAtLeast } from './shared/stableVersion.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'RELEASE-NOTES-0.31.0.md',
  'RELEASE-CHECKLIST.md',
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
  if (packageJson.version !== '0.31.0') fail(`package.json doit publier 0.31.0, reçu ${packageJson.version}.`);
  if (packageLock.version !== '0.31.0' || packageLock.packages?.['']?.version !== '0.31.0') {
    fail('package-lock.json doit être aligné sur 0.31.0.');
  }
  if (!isStableVersionAtLeast(packageJson.version, 20)) {
    fail('la version courante doit être reconnue comme stable par le garde-fou partagé.');
  }
  for (const invalid of ['0.19.9', '0.31.0-rc.1', '1.0.0', '0.31']) {
    if (isStableVersionAtLeast(invalid, 20)) fail(`le garde-fou accepte à tort ${invalid}.`);
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
    if (!source.includes('3200 * 1024')) fail(`le budget JavaScript ${label} n’est pas aligné sur 3200 Kio.`);
    if (source.includes('2940 * 1024')) fail(`le budget JavaScript ${label} conserve l’ancien seuil de 2940 Kio.`);
  }

  const navigationAudit = read('scripts/audit-unified-sync-center.mjs');
  for (const marker of [
    'navigationItemIsActive(location.pathname, item)',
    'ne sélectionne que Rappels sur sa route dédiée',
    'Le raccourci Paramètres de l’en-tête ne doit pas exposer un état actif',
  ]) {
    if (!navigationAudit.includes(marker)) fail(`le garde-fou E3 actuel est incomplet : ${marker}.`);
  }
  if (navigationAudit.includes("settingsHeaderLink.includes('end')")) {
    fail('le garde-fou E3 conserve l’ancienne attente NavLink sur l’en-tête.');
  }

  const socialAudit = read('scripts/audit-social-friend-removal-0.29.0.mjs');
  for (const marker of [
    'setPendingFriendRemoval(friend)',
    '<ConfirmationDialog',
    'confirmLabel="Supprimer l’ami"',
    'void removeFriend(pendingFriendRemoval)',
  ]) {
    if (!socialAudit.includes(marker)) fail(`l’audit social ne suit pas la confirmation actuelle : ${marker}.`);
  }

  const photoAudit = read('scripts/audit-photo-ai.mjs');
  for (const marker of [
    'Autoriser l’analyse IA pour cette photo',
    'Autoriser l’analyse IA distante pour cette photo',
  ]) {
    if (!photoAudit.includes(marker)) fail(`l’audit Photo IA ne suit pas le consentement actuel : ${marker}.`);
  }

  const releaseNotes = read('RELEASE-NOTES-0.31.0.md');
  const checklist = read('RELEASE-CHECKLIST.md');
  for (const marker of [
    'SportPilot 0.31.0',
    'Tag attendu : `v0.31.0`',
    'Migration Dexie : aucune',
    'budget de production actuel de 3 200 Kio',
  ]) {
    if (!releaseNotes.includes(marker)) fail(`notes de release incomplètes : ${marker}.`);
  }
  for (const marker of ['release/0.31.0', 'Tag annoté `v0.31.0`', 'audit:release-consolidation']) {
    if (!checklist.includes(marker)) fail(`checklist de publication incomplète : ${marker}.`);
  }

  const versions = read('src/infrastructure/database/migrations/versions.ts');
  const backup = read('src/infrastructure/backup/backupMigrations.ts');
  const cloud = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_10\b/.test(versions)) fail('Dexie doit rester en v10.');
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*9\b/.test(backup)) fail('la sauvegarde JSON doit rester en v9.');
  if (!cloud.includes('SYNC_PROTOTYPE_DATABASE_VERSION = 14')) fail('le runtime cloud doit rester en v14.');
}

if (failures.length > 0) {
  console.error('Audit de consolidation 0.31.0 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit de consolidation 0.31.0 réussi : version, audits, budgets, navigation, consentements et contrats de stockage sont alignés.');
