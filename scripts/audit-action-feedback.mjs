import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);
const expectedVersion = '0.23.1';

const requiredFiles = [
  'src/shared/toast/useActionToast.ts',
  'src/shared/toast/useActionToast.test.tsx',
  'src/shared/toast/pendingToast.ts',
  'src/shared/toast/pendingToast.test.ts',
  'src/shared/toast/ToastProvider.test.tsx',
  'src/app/actionFeedbackReadiness.test.ts',
  'docs/architecture/action-feedback-0.23.1.md',
  'RELEASE-NOTES-0.23.1.md',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`fichier 0.23.1 absent : ${path}.`);
}

if (failures.length === 0) {
  const packageJson = JSON.parse(read('package.json'));
  const packageLock = JSON.parse(read('package-lock.json'));

  if (packageJson.version !== expectedVersion) {
    fail(`package.json doit publier ${expectedVersion}.`);
  }
  if (
    packageLock.version !== expectedVersion
    || packageLock.packages?.['']?.version !== expectedVersion
  ) {
    fail('package-lock.json ne correspond pas à SportPilot 0.23.1.');
  }

  const actionToast = read('src/shared/toast/useActionToast.ts');
  for (const marker of [
    'useContext(ToastContext)',
    'successAfterReload',
    'action-success:',
    'action-error:',
    'getActionErrorMessage',
  ]) {
    if (!actionToast.includes(marker)) {
      fail(`socle de notification incomplet : ${marker}.`);
    }
  }

  const pendingToast = read('src/shared/toast/pendingToast.ts');
  for (const marker of [
    'sportpilot:pending-toast:v1',
    'queuePendingToast',
    'consumePendingToast',
    'storage.removeItem',
  ]) {
    if (!pendingToast.includes(marker)) {
      fail(`notification après rechargement incomplète : ${marker}.`);
    }
  }

  const provider = read('src/shared/toast/ToastProvider.tsx');
  if (!provider.includes('consumePendingToast')) {
    fail('ToastProvider ne restitue pas la confirmation conservée avant rechargement.');
  }

  const coveredSurfaces = [
    'src/features/goals/components/GoalEditor.tsx',
    'src/features/goals/pages/GoalsPage.tsx',
    'src/features/profile/pages/ProfilePage.tsx',
    'src/features/dashboard-customization/pages/DashboardCustomizationPage.tsx',
    'src/features/dashboard/components/DashboardQuickActions.tsx',
    'src/features/dashboard/components/DailyInputsPanel.tsx',
    'src/features/settings/pages/AdvancedSettingsPage.tsx',
    'src/features/settings/components/AutomaticSyncSettingsPanel.tsx',
    'src/features/settings/components/SelectiveDataResetPanel.tsx',
    'src/features/reminders/pages/RoutineRemindersPage.tsx',
    'src/features/weight/pages/WeightPage.tsx',
    'src/features/products/pages/FoodProductEditorPage.tsx',
    'src/features/products/pages/FoodProductsPage.tsx',
    'src/features/recipes/pages/RecipeEditorPage.tsx',
    'src/features/recipes/pages/RecipeEntryEditorPage.tsx',
    'src/features/recipes/pages/RecipesPage.tsx',
    'src/features/favorite-meals/pages/FavoriteMealsPage.tsx',
    'src/features/endurance-templates/pages/EnduranceTemplatesPage.tsx',
    'src/features/strength-exercises/pages/StrengthExerciseEditorPage.tsx',
    'src/features/strength-exercises/pages/StrengthExercisesPage.tsx',
    'src/features/strength-templates/pages/WorkoutTemplateEditorPage.tsx',
    'src/features/strength-templates/pages/WorkoutTemplatesPage.tsx',
    'src/features/strength-sessions/pages/WorkoutSessionsPage.tsx',
    'src/features/backup/pages/BackupPage.tsx',
    'src/features/backup/components/SelectiveBackupRestorePanel.tsx',
    'src/features/backup/components/AdvancedCsvExportPanel.tsx',
    'src/features/backup/components/StoragePersistenceCard.tsx',
    'src/features/account-devices/components/CloudAccountRestorePanel.tsx',
    'src/features/account-devices/components/GuestDataImportPanel.tsx',
    'src/features/account-devices/pages/AccountDevicesPage.tsx',
    'src/features/progress-reports/pages/ProgressReportsPage.tsx',
    'src/features/trash/pages/TrashPage.tsx',
  ];

  for (const path of coveredSurfaces) {
    if (!read(path).includes('useActionToast')) {
      fail(`retour d’action centralisé absent : ${path}.`);
    }
  }

  const workoutSession = read('src/features/strength-sessions/hooks/useWorkoutSession.ts');
  if (!workoutSession.includes("setSaveStatus('saved')")) {
    fail('les écritures fréquentes de séance doivent conserver leur indicateur discret Enregistré.');
  }

  for (const pipeline of ['check', 'ci']) {
    if (!String(packageJson.scripts?.[pipeline] ?? '').includes('audit:action-feedback')) {
      fail(`le pipeline ${pipeline} n’exécute pas l’audit 0.23.1.`);
    }
  }
  if (
    packageJson.scripts?.['audit:action-feedback']
    !== 'node scripts/audit-action-feedback.mjs'
  ) {
    fail('le script audit:action-feedback est absent ou incohérent.');
  }

  const versions = read('src/infrastructure/database/migrations/versions.ts');
  const backup = read('src/infrastructure/backup/backupMigrations.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_8\b/.test(versions)) {
    fail('la base métier doit rester en Dexie v8.');
  }
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*7\b/.test(backup)) {
    fail('la sauvegarde JSON doit rester en v7.');
  }

  const releaseNotes = read('RELEASE-NOTES-0.23.1.md');
  for (const marker of [
    'Confirmations d’action',
    'après rechargement',
    'Aucune migration',
    'iPhone 15 sous iOS 26',
  ]) {
    if (!releaseNotes.includes(marker)) {
      fail(`notes de version 0.23.1 incomplètes : ${marker}.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Audit 0.23.1 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit 0.23.1 réussi : confirmations centralisées, erreurs visibles, rechargements couverts, écritures fréquentes non intrusives et versions de données inchangées.',
);
