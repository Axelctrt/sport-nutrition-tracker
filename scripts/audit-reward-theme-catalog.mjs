import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isStableVersionAtLeast, stableVersionExpectation } from './shared/stableVersion.mjs';

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

const packageJson = JSON.parse(read("package.json"));
const achievements = read("src/domain/rewards/achievements.ts");
const achievementService = read(
  "src/application/rewards/achievementService.ts",
);
const visualThemes = read("src/domain/rewards/visualThemes.ts");
const themeService = read("src/application/rewards/themeAchievementService.ts");
const panel = read("src/features/settings/components/RewardThemesPanel.tsx");
const css = read("src/styles/unlockableThemes.css");
const desktopSidebar = read("src/app/layouts/DesktopSidebar.tsx");
const goalCard = read("src/features/goals/components/GoalCard.tsx");
const goalValueFormatter = read("src/features/goals/utils/formatGoalValue.ts");
const productionAudit = read("scripts/audit-rc.mjs");
const automaticSyncReleaseAudit = read(
  "scripts/audit-automatic-sync-release.mjs",
);

if (!isStableVersionAtLeast(packageJson.version, 24)) {
  fail(`la version doit être ${stableVersionExpectation(24)}, reçue ${String(packageJson.version)}.`);
}
if (!packageJson.scripts?.["audit:reward-theme-catalog"]) {
  fail("le script audit:reward-theme-catalog est absent de package.json.");
}
if (
  !String(packageJson.scripts?.check ?? "").includes(
    "audit:reward-theme-catalog",
  )
) {
  fail("npm run check ne lance pas audit:reward-theme-catalog.");
}

const achievementIds = [...achievements.matchAll(/id: "([^"]+)"/g)].map(
  (match) => match[1],
);
if (achievementIds.length !== 50) {
  fail(
    `le catalogue doit contenir exactement 50 badges, ${achievementIds.length} détecté(s).`,
  );
}
if (new Set(achievementIds).size !== achievementIds.length) {
  fail("le catalogue de badges contient des identifiants dupliqués.");
}
for (const requiredId of [
  "first-session",
  "ten-sessions",
  "strength-five",
  "strength-twenty",
  "active-seven",
  "versatile-three",
  "bench-100",
  "deadlift-150",
  "nutrition-seven",
]) {
  if (!achievementIds.includes(requiredId)) {
    fail(`le badge attendu ${requiredId} est absent du catalogue.`);
  }
}
for (const category of [
  "running",
  "swimming",
  "strength",
  "steps",
  "consistency",
  "versatility",
  "nutrition",
]) {
  if (!achievements.includes(`category: "${category}"`)) {
    fail(`la catégorie de badge ${category} est absente.`);
  }
}
for (const metric of [
  "benchPressMaxKg",
  "squatMaxKg",
  "deadliftMaxKg",
  "runningFiveKmUnder25",
  "strengthVolumeKg",
]) {
  if (!achievementService.includes(metric)) {
    fail(`la métrique de badge ${metric} n’est pas calculée.`);
  }
}

const themeIds = [...visualThemes.matchAll(/id: "([^"]+)"/g)].map(
  (match) => match[1],
);
if (themeIds.length !== 15) {
  fail(
    `le catalogue doit contenir 15 thèmes au total, ${themeIds.length} détecté(s).`,
  );
}
if (new Set(themeIds).size !== themeIds.length) {
  fail("le catalogue de thèmes contient des identifiants dupliqués.");
}
for (const requiredId of [
  "classic",
  "endurance",
  "power",
  "balance",
  "aurore",
  "foret",
  "ocean",
  "acier",
  "nuit-polaire",
  "abysses",
  "volcan",
  "canopee",
  "cosmos",
  "forge",
  "nexus-vivant",
]) {
  if (!themeIds.includes(requiredId)) {
    fail(`le thème attendu ${requiredId} est absent du catalogue.`);
  }
  if (
    !css.includes(`data-sport-theme="${requiredId}"`) &&
    requiredId !== "classic"
  ) {
    fail(`le thème ${requiredId} n’a pas de règle CSS dédiée.`);
  }
}
if (!visualThemes.includes("dynamic: true")) {
  fail(
    "le thème légendaire Nexus doit rester identifié comme thème ultime du catalogue.",
  );
}
if (panel.includes("previewVisualTheme") || panel.includes("clearVisualThemePreview")) {
  fail(
    "le panneau de thèmes ne doit plus appliquer de prévisualisation complète à toute l’app.",
  );
}
if (
  !visualThemes.includes("VisualThemeStyleMode") ||
  !visualThemes.includes("styleMode")
) {
  fail(
    "l’état des thèmes doit mémoriser le style complet ou minimaliste choisi par l’utilisateur.",
  );
}
if (
  !panel.includes("Style du thème") ||
  !panel.includes("Minimaliste") ||
  !panel.includes("updateVisualThemeStyleMode")
) {
  fail(
    "le panneau de thèmes doit proposer le choix global Complet / Minimaliste.",
  );
}
if (panel.includes("Prévisualiser tout") || panel.includes("Aperçu complet temporaire")) {
  fail(
    "le bouton Prévisualiser tout et la bannière d’aperçu complet doivent être supprimés.",
  );
}
if (
  !panel.includes("SportPilot classique n’a pas d’aperçu complet") ||
  !panel.includes("Minimaliste uniquement")
) {
  fail(
    "le panneau de thèmes doit continuer à gérer SportPilot classique en minimaliste.",
  );
}
if (
  !panel.includes("Voir un aperçu rapide de") ||
  !panel.includes('role="dialog"') ||
  !panel.includes("data-theme-quick-preview") ||
  !panel.includes("data-theme-preview-dialog") ||
  !panel.includes("data-theme-preview-backdrop") ||
  !panel.includes("createPortal")
) {
  fail(
    "le panneau de thèmes doit proposer uniquement un aperçu rapide en mini pop-up fixe via l’icône œil.",
  );
}
if (panel.includes("Quitter l’aperçu")) {
  fail(
    "l’ancien mode de validation complète ne doit plus être présent.",
  );
}
if (!panel.includes("Ultime")) {
  fail(
    "le badge Nexus ne doit plus laisser entendre une animation obligatoire : libellé Ultime attendu.",
  );
}
if (!themeService.includes("previewableCount")) {
  fail(
    "le snapshot des thèmes ne déclare pas le nombre de thèmes consultables.",
  );
}
if (!productionAudit.includes("totalJavaScriptBytes: 3200 * 1024")) {
  fail(
    "le budget JavaScript de production doit rester aligné sur le budget 0.32.0 validé après consolidation UX.",
  );
}
if (!productionAudit.includes("totalCssBytes: 176 * 1024")) {
  fail(
    "le budget CSS de production doit rester aligné sur 176 Kio pour cette phase 0.24.0.",
  );
}
if (
  !automaticSyncReleaseAudit.includes(
    "budget JavaScript global validé de 3200 Kio",
  )
) {
  fail("l’audit F4 doit rester aligné avec le budget JavaScript 0.32.0.");
}

for (const marker of [
  "accessible dark-mode fixes",
  "--sport-reward-atmosphere",
  "--sport-reward-pattern",
  'data-sport-theme-style="minimal"',
  "--sport-reward-base",
  "sport-theme-app",
  "data-theme-preview-dialog",
  'html.dark[data-sport-theme]:not([data-sport-theme="classic"])',
  'data-sport-preview="volcan"',
  'data-sport-preview="ocean"',
  'data-sport-preview="abysses"',
  'data-sport-preview="cosmos"',
  'data-sport-preview="nexus-vivant"',
]) {
  if (!css.includes(marker)) {
    fail(
      `le rendu R4.4 coloré et statique des thèmes est incomplet : ${marker}.`,
    );
  }
}
for (const forbidden of [
  "/theme-scenes/",
  "--sport-reward-image",
  "--sport-preview-image",
  "@keyframes",
  "sport-ocean-drift",
  "sport-abyssal-current",
  "sport-ember-rise",
  "sport-cosmos-orbit",
  "sport-nexus-awaken",
]) {
  if (
    css.includes(forbidden) ||
    visualThemes.includes(forbidden) ||
    panel.includes(forbidden)
  ) {
    fail(
      `la phase R3d ne doit plus dépendre du rendu cinématique image-backed ou animé : ${forbidden}.`,
    );
  }
}
if (/animation\s*:/.test(css)) {
  fail("la phase R3d ne doit contenir aucune animation CSS de thème.");
}
for (const asset of [
  "public/theme-scenes/ocean-cinematic.webp",
  "public/theme-scenes/abysses-cinematic.webp",
  "public/theme-scenes/volcan-cinematic.webp",
  "public/theme-scenes/canopee-cinematic.webp",
  "public/theme-scenes/cosmos-cinematic.webp",
  "public/theme-scenes/nexus-cinematic.webp",
]) {
  if (existsSync(join(root, asset))) {
    fail(
      `l’asset ${asset} doit être supprimé : retour à des fonds CSS colorés.`,
    );
  }
}
for (const marker of [
  "plus coloré",
  "sans asset image ni animation",
  "lave suggérée",
  "sci-fi sans animation",
  "Nexus statique ultime",
]) {
  if (!visualThemes.includes(marker)) {
    fail(
      `la direction artistique R3d du catalogue ne mentionne pas ${marker}.`,
    );
  }
}
if (
  !desktopSidebar.includes(
    'className="mt-5 space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800"',
  )
) {
  fail(
    "le menu latéral desktop doit supprimer le grand espace automatique entre Bilan hebdomadaire et Profil.",
  );
}
if (
  desktopSidebar.includes(
    'className="mt-auto space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800"',
  )
) {
  fail(
    "le menu latéral desktop ne doit plus utiliser mt-auto pour la navigation secondaire.",
  );
}
if (
  !panel.includes("sport-theme-preview") ||
  !panel.includes("data-sport-preview")
) {
  fail("les miniatures de thèmes ne disposent pas de scènes CSS dédiées.");
}
for (const accessibleTheme of [
  "endurance",
  "power",
  "balance",
  "aurore",
  "foret",
  "acier",
  "nuit-polaire",
]) {
  const themeRulePattern = new RegExp(
    `html\\[data-sport-theme="${accessibleTheme}"\\][\\s\\S]*?--sport-reward-vignette:[\\s\\S]*?--sport-reward-foreground:`,
    "m",
  );
  if (!themeRulePattern.test(css)) {
    fail(
      `le thème accessible ${accessibleTheme} doit aligner son rendu complet sur sa mini preview.`,
    );
  }
}
if (!read("src/app/layouts/AppLayout.tsx").includes("sport-theme-app")) {
  fail(
    "le layout principal doit exposer sport-theme-app pour aligner le rendu réel sur la preview.",
  );
}

if (
  !goalCard.includes("formatGoalValue") ||
  !goalValueFormatter.includes("unit === 'km' ? 1 : 2")
) {
  fail(
    "les objectifs doivent arrondir les distances en kilomètres à une décimale.",
  );
}

if (failures.length > 0) {
  console.error("\nAudit récompenses et thèmes 0.24.0 échoué :");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    "Audit récompenses et thèmes 0.24.0 réussi : 50 badges, 15 thèmes, pop-up œil unique fixe, bouton Prévisualiser tout supprimé, SportPilot classique réservé au minimaliste, mode sombre corrigé, règles de déblocage conservées et progressions arrondies.",
  );
}
