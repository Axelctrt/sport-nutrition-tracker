import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

const packageJson = JSON.parse(read('package.json'));
const achievements = read('src/domain/rewards/achievements.ts');
const achievementService = read('src/application/rewards/achievementService.ts');
const visualThemes = read('src/domain/rewards/visualThemes.ts');
const themeService = read('src/application/rewards/themeAchievementService.ts');
const panel = read('src/features/settings/components/RewardThemesPanel.tsx');
const css = read('src/styles/unlockableThemes.css');
const productionAudit = read('scripts/audit-rc.mjs');
const automaticSyncReleaseAudit = read('scripts/audit-automatic-sync-release.mjs');

if (packageJson.version !== '0.23.1') {
  fail(`la phase 0.24.0 R1 doit rester sur la version applicative 0.23.1 avant finalisation, version trouvée : ${packageJson.version}.`);
}
if (!packageJson.scripts?.['audit:reward-theme-catalog']) {
  fail('le script audit:reward-theme-catalog est absent de package.json.');
}
if (!String(packageJson.scripts?.check ?? '').includes('audit:reward-theme-catalog')) {
  fail('npm run check ne lance pas audit:reward-theme-catalog.');
}

const achievementIds = [...achievements.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
if (achievementIds.length !== 50) {
  fail(`le catalogue doit contenir exactement 50 badges, ${achievementIds.length} détecté(s).`);
}
if (new Set(achievementIds).size !== achievementIds.length) {
  fail('le catalogue de badges contient des identifiants dupliqués.');
}
for (const requiredId of [
  'first-session',
  'ten-sessions',
  'strength-five',
  'strength-twenty',
  'active-seven',
  'versatile-three',
  'bench-100',
  'deadlift-150',
  'nutrition-seven',
]) {
  if (!achievementIds.includes(requiredId)) {
    fail(`le badge attendu ${requiredId} est absent du catalogue.`);
  }
}
for (const category of ['running', 'swimming', 'strength', 'steps', 'consistency', 'versatility', 'nutrition']) {
  if (!achievements.includes(`category: "${category}"`)) {
    fail(`la catégorie de badge ${category} est absente.`);
  }
}
for (const metric of ['benchPressMaxKg', 'squatMaxKg', 'deadliftMaxKg', 'runningFiveKmUnder25', 'strengthVolumeKg']) {
  if (!achievementService.includes(metric)) {
    fail(`la métrique de badge ${metric} n’est pas calculée.`);
  }
}

const themeIds = [...visualThemes.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
if (themeIds.length !== 15) {
  fail(`le catalogue doit contenir 15 thèmes au total, ${themeIds.length} détecté(s).`);
}
if (new Set(themeIds).size !== themeIds.length) {
  fail('le catalogue de thèmes contient des identifiants dupliqués.');
}
for (const requiredId of [
  'classic',
  'endurance',
  'power',
  'balance',
  'aurore',
  'foret',
  'ocean',
  'acier',
  'nuit-polaire',
  'abysses',
  'volcan',
  'canopee',
  'cosmos',
  'forge',
  'nexus-vivant',
]) {
  if (!themeIds.includes(requiredId)) {
    fail(`le thème attendu ${requiredId} est absent du catalogue.`);
  }
  if (!css.includes(`data-sport-theme="${requiredId}"`) && requiredId !== 'classic') {
    fail(`le thème ${requiredId} n’a pas de règle CSS dédiée.`);
  }
}
if (!visualThemes.includes('dynamic: true')) {
  fail('le thème légendaire dynamique n’est pas identifié comme dynamique.');
}
if (!visualThemes.includes('previewVisualTheme') || !visualThemes.includes('clearVisualThemePreview')) {
  fail('les fonctions de prévisualisation de thème sont absentes.');
}
if (!panel.includes('Prévisualiser') || !panel.includes('Quitter l’aperçu')) {
  fail('le panneau de thèmes ne propose pas la prévisualisation et la sortie d’aperçu.');
}
if (!themeService.includes('previewableCount')) {
  fail('le snapshot des thèmes ne déclare pas le nombre de thèmes prévisualisables.');
}
if (!productionAudit.includes('totalJavaScriptBytes: 2750 * 1024')) {
  fail('le budget JavaScript de production doit être aligné sur 2750 Kio pour cette phase catalogue.');
}
if (!productionAudit.includes('totalCssBytes: 104 * 1024')) {
  fail('le budget CSS de production doit être aligné sur 104 Kio pour cette phase catalogue.');
}
if (!automaticSyncReleaseAudit.includes('budget JavaScript global validé de 2750 Kio')) {
  fail('l’audit F4 doit être aligné avec le budget JavaScript 2750 Kio.');
}

if (failures.length > 0) {
  console.error('\nAudit récompenses et thèmes 0.24.0 R1 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Audit récompenses et thèmes 0.24.0 R1 réussi : 50 badges, 15 thèmes, aperçu libre et budgets de production alignés.');
}
