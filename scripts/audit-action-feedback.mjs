import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'src/shared/toast/useActionToast.ts',
  'src/shared/toast/useActionToast.test.tsx',
  'src/shared/toast/pendingToast.ts',
  'src/shared/toast/pendingToast.test.ts',
  'src/shared/toast/ToastProvider.test.tsx',
  'src/shared/toast/dashboardOnboardingFeedbackContract.test.ts',
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

  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(packageJson.version))) {
    fail(`package.json doit publier une version sémantique, version trouvée : ${String(packageJson.version)}.`);
  }
  if (
    packageLock.version !== packageJson.version
    || packageLock.packages?.['']?.version !== packageJson.version
  ) {
    fail(`package-lock.json ne correspond pas à SportPilot ${packageJson.version}.`);
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

  const toastSurfaces = [
    'src/features/goals/components/GoalEditor.tsx',
    'src/features/goals/pages/GoalsPage.tsx',
    'src/features/profile/pages/ProfilePage.tsx',
    'src/features/settings/components/AutomaticSyncSettingsPanel.tsx',
    'src/features/reminders/pages/RoutineRemindersPage.tsx',
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
    'src/features/account-devices/components/CloudAccountRestorePanel.tsx',
    'src/features/account-devices/components/GuestDataImportPanel.tsx',
    'src/features/account-devices/pages/AccountDevicesPage.tsx',
  ];

  for (const path of toastSurfaces) {
    if (!read(path).includes('useActionToast')) {
      fail(`retour d’action centralisé absent : ${path}.`);
    }
  }

  const dashboardLocalFeedbackSurfaces = [
    ['src/features/dashboard-customization/pages/DashboardCustomizationPage.tsx', 'setFeedback'],
    ['src/features/dashboard/components/DailyInputsPanel.tsx', 'setWeightFeedback'],
    ['src/features/dashboard/components/DashboardQuickActions.tsx', 'setFeedback'],
  ];

  for (const [path, localMarker] of dashboardLocalFeedbackSurfaces) {
    const source = read(path);
    for (const marker of [localMarker, 'InlineNotice']) {
      if (!source.includes(marker)) {
        fail(`feedback local Dashboard incomplet (${marker}) : ${path}.`);
      }
    }
    if (source.includes('useActionToast') || source.includes('actionToast.')) {
      fail(`la surface Dashboard locale ne doit pas cumuler notice et toast : ${path}.`);
    }
  }

  const goalQuickEntry = read('src/features/dashboard/components/GoalQuickEntryOverlay.tsx');
  for (const marker of ['useActionToast', 'actionToast.success', 'setErrorMessage', 'InlineNotice', 'close();']) {
    if (!goalQuickEntry.includes(marker)) {
      fail(`feedback rapide Objectifs incomplet (${marker}).`);
    }
  }
  if (goalQuickEntry.includes('actionToast.error') || (goalQuickEntry.match(/actionToast\.success/g) ?? []).length !== 2) {
    fail('Objectifs doit réserver ses deux toasts aux succès qui ferment la surface et garder les erreurs locales.');
  }

  const onboarding = read('src/features/onboarding/pages/OnboardingPage.tsx');
  for (const marker of [
    'actionToast.success',
    'setSaveError',
    'InlineNotice',
    'saveProfileOnboardingCompletion',
    'navigate(routePaths.dashboard',
  ]) {
    if (!onboarding.includes(marker)) {
      fail(`feedback onboarding incomplet (${marker}).`);
    }
  }
  if (onboarding.includes('actionToast.error') || (onboarding.match(/actionToast\./g) ?? []).length !== 1) {
    fail('Onboarding doit garder une erreur finale locale unique et son unique signal de succès dédié.');
  }
  if (!actionToast.includes("'onboarding-profile-create'")) {
    fail('la réussite onboarding doit rester reliée au feedback dédié révélé après navigation.');
  }

  const sportNutritionMixedSurfaces = [
    ['src/features/goals/components/GoalEditor.tsx', 'setError'],
    ['src/features/goals/pages/GoalsPage.tsx', 'setError'],
    ['src/features/products/pages/FoodProductEditorPage.tsx', 'setActionErrorMessage'],
    ['src/features/products/pages/FoodProductsPage.tsx', 'errorMessage'],
    ['src/features/recipes/pages/RecipesPage.tsx', 'errorMessage'],
    ['src/features/favorite-meals/pages/FavoriteMealsPage.tsx', 'errorMessage'],
    ['src/features/endurance-templates/pages/EnduranceTemplatesPage.tsx', 'setErrorMessage'],
    ['src/features/strength-exercises/pages/StrengthExercisesPage.tsx', 'actionErrorMessage'],
    ['src/features/strength-templates/pages/WorkoutTemplatesPage.tsx', 'actionErrorMessage'],
    ['src/features/strength-sessions/pages/WorkoutSessionsPage.tsx', 'errorMessage'],
  ];

  for (const [path, localMarker] of sportNutritionMixedSurfaces) {
    const source = read(path);
    for (const marker of ['useActionToast', 'actionToast.success', localMarker, 'InlineNotice']) {
      if (!source.includes(marker)) {
        fail(`feedback mixte Sport/Nutrition incomplet (${marker}) : ${path}.`);
      }
    }
    if (source.includes('actionToast.error')) {
      fail(`une erreur Sport/Nutrition déjà locale ne doit pas aussi déclencher un toast : ${path}.`);
    }
  }

  const weightPage = read('src/features/weight/pages/WeightPage.tsx');
  for (const marker of ['setFeedback', 'InlineNotice']) {
    if (!weightPage.includes(marker)) {
      fail(`feedback local Poids incomplet : ${marker}.`);
    }
  }
  if (weightPage.includes('useActionToast') || weightPage.includes('actionToast.')) {
    fail('Poids doit conserver un feedback local unique sans toast concurrent.');
  }

  const foodProductEditor = read('src/features/products/pages/FoodProductEditorPage.tsx');
  if (foodProductEditor.includes('food-product-refresh:')) {
    fail('l’actualisation Open Food Facts doit rester locale sans toast concurrent.');
  }

  const recipesPage = read('src/features/recipes/pages/RecipesPage.tsx');
  if (!recipesPage.includes('recipe-return:') || recipesPage.includes('recipe-delete:')) {
    fail('Recettes doit réserver le toast au retour d’éditeur et garder la suppression locale.');
  }

  const favoriteMealsPage = read('src/features/favorite-meals/pages/FavoriteMealsPage.tsx');
  if (favoriteMealsPage.includes('favorite-meal-apply:') || !favoriteMealsPage.includes('favorite-meal-delete:')) {
    fail('Repas favoris doit garder l’ajout local et réserver le toast à la suppression transitoire.');
  }

  const backupPage = read('src/features/backup/pages/BackupPage.tsx');
  for (const marker of ['useActionToast', 'actionToast.success', 'setFeedback', 'InlineNotice']) {
    if (!backupPage.includes(marker)) {
      fail(`feedback mixte Sauvegarde incomplet : ${marker}.`);
    }
  }
  if (backupPage.includes('actionToast.error')) {
    fail('Sauvegarde doit conserver les erreurs sur place sans toast concurrent.');
  }

  const accountDevicesPage = read('src/features/account-devices/pages/AccountDevicesPage.tsx');
  for (const marker of ['useActionToast', 'actionToast.successAfterReload', 'setFeedback', 'InlineNotice']) {
    if (!accountDevicesPage.includes(marker)) {
      fail(`feedback mixte Compte et appareils incomplet : ${marker}.`);
    }
  }
  if (accountDevicesPage.includes('actionToast.error')) {
    fail('Compte et appareils doit conserver les erreurs sur place sans toast concurrent.');
  }

  const dataAccountLocalFeedbackSurfaces = [
    ['src/features/backup/components/AdvancedCsvExportPanel.tsx', 'setFeedback'],
    ['src/features/backup/components/SelectiveBackupRestorePanel.tsx', 'setFeedback'],
    ['src/features/settings/components/SelectiveDataResetPanel.tsx', 'setResult'],
  ];

  for (const [path, localMarker] of dataAccountLocalFeedbackSurfaces) {
    const source = read(path);
    for (const marker of [localMarker, 'InlineNotice']) {
      if (!source.includes(marker)) {
        fail(`feedback local Data/Compte incomplet (${marker}) : ${path}.`);
      }
    }
    if (source.includes('useActionToast') || source.includes('actionToast.')) {
      fail(`la surface Data/Compte locale ne doit pas cumuler notice et toast : ${path}.`);
    }
  }

  for (const path of [
    'src/features/account-devices/components/CloudAccountRestorePanel.tsx',
    'src/features/account-devices/components/GuestDataImportPanel.tsx',
  ]) {
    const source = read(path);
    for (const marker of ['useActionToast', 'actionToast.successAfterReload', 'InlineNotice']) {
      if (!source.includes(marker)) {
        fail(`feedback après rechargement incomplet (${marker}) : ${path}.`);
      }
    }
    if (source.includes('actionToast.error') || (source.match(/actionToast\./g) ?? []).length !== 1) {
      fail(`la surface après rechargement doit réserver son unique toast au succès : ${path}.`);
    }
  }

  const automaticSyncSettings = read(
    'src/features/settings/components/AutomaticSyncSettingsPanel.tsx',
  );
  for (const marker of ['useActionToast', 'actionToast.success', 'setErrorMessage', 'InlineNotice']) {
    if (!automaticSyncSettings.includes(marker)) {
      fail(`feedback de synchronisation automatique incomplet : ${marker}.`);
    }
  }
  if (
    automaticSyncSettings.includes('actionToast.error')
    || (automaticSyncSettings.match(/actionToast\./g) ?? []).length !== 1
  ) {
    fail('la synchronisation automatique doit garder le toast de succès et l’erreur locale.');
  }

  const localFeedbackSurfaces = [
    ['src/features/settings/pages/AdvancedSettingsPage.tsx', 'InlineNotice'],
    ['src/features/settings/pages/SettingsCategoryPage.tsx', 'InlineNotice'],
    ['src/features/progress-reports/pages/ProgressReportsPage.tsx', 'role="status"'],
    ['src/features/trash/pages/TrashPage.tsx', 'aria-live="polite"'],
  ];

  for (const [path, localMarker] of localFeedbackSurfaces) {
    const source = read(path);
    for (const marker of ['setFeedback', localMarker]) {
      if (!source.includes(marker)) {
        fail(`feedback local incomplet (${marker}) : ${path}.`);
      }
    }
    if (source.includes('useActionToast') || source.includes('actionToast.')) {
      fail(`la surface locale ne doit pas cumuler notice et toast : ${path}.`);
    }
  }

  const storagePersistence = read('src/features/backup/components/StoragePersistenceCard.tsx');
  for (const marker of [
    "tone: 'success'",
    "tone: 'error'",
    '<InlineNotice',
    "role={feedback.tone === 'error' ? 'alert' : 'status'}",
  ]) {
    if (!storagePersistence.includes(marker)) {
      fail(`feedback local de persistance incomplet : ${marker}.`);
    }
  }
  if (storagePersistence.includes('useActionToast')) {
    fail('la persistance du stockage ne doit pas cumuler notice locale et toast.');
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
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_12\b/.test(versions)) {
    fail('la base métier doit utiliser Dexie v12.');
  }
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*11\b/.test(backup)) {
    fail('la sauvegarde JSON doit rester en v11.');
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
  console.error('Audit confirmations d’action échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit confirmations d’action réussi : confirmations centralisées ou locales selon le contexte, erreurs visibles, rechargements couverts, écritures fréquentes non intrusives et versions de données inchangées.',
);
