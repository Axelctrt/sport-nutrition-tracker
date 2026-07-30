import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isStableVersionAtLeast, stableVersionExpectation } from './shared/stableVersion.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const fail = (message) => {
  throw new Error(`Audit isolation des comptes échoué : ${message}`);
};

const requiredFiles = [
  'src/app/data-spaces/DataSpaceAccountGate.tsx',
  'src/infrastructure/data-spaces/dataSpaceRegistry.ts',
  'src/infrastructure/data-spaces/accountDataSpaceService.ts',
  'src/infrastructure/data-spaces/accountDeviceManagementService.ts',
  'src/features/account-devices/pages/AccountDevicesPage.tsx',
  'src/infrastructure/data-spaces/accountDataIsolation.integration.test.ts',
  'src/infrastructure/database/database.ts',
  'src/infrastructure/database/databaseNames.ts',
  'docs/architecture/account-data-spaces-0.18.0-a4.md',
  'RELEASE-NOTES-0.18.0.md',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) {
    fail(`le fichier requis ${path} est absent.`);
  }
}

const packageJson = JSON.parse(read('package.json'));
if (!isStableVersionAtLeast(packageJson.version, 20)) {
  fail(`la version doit être ${stableVersionExpectation(20)}, reçue ${String(packageJson.version)}.`);
}

const scripts = packageJson.scripts ?? {};
if (scripts['audit:account-isolation'] !== 'node scripts/audit-account-isolation.mjs') {
  fail('le script audit:account-isolation est absent ou incohérent.');
}
for (const pipeline of ['check', 'ci']) {
  if (!String(scripts[pipeline] ?? '').includes('audit:account-isolation')) {
    fail(`le pipeline ${pipeline} n’exécute pas l’audit d’isolation.`);
  }
}

const appSource = read('src/app/App.tsx');
if (!/<DataSpaceAccountGate>[\s\S]*<AppProviders>/.test(appSource)) {
  fail('la barrière de compte doit envelopper les providers métier.');
}
if (!/<\/AppProviders>[\s\S]*<\/DataSpaceAccountGate>/.test(appSource)) {
  fail('les providers métier sortent de la barrière de compte.');
}

const databaseRuntime = read('src/infrastructure/database/database.ts');
for (const marker of [
  'getActiveDataSpace()',
  'new AppDatabase(activeDataSpace.databaseName)',
]) {
  if (!databaseRuntime.includes(marker)) {
    fail(`l’initialisation de la base active ne contient pas ${marker}.`);
  }
}

const databaseNames = read('src/infrastructure/database/databaseNames.ts');
if (!databaseNames.includes("DEFAULT_DATABASE_NAME = 'sportpilot-local-database'")) {
  fail('le nom historique de la base invitée a changé.');
}
if (!databaseNames.includes('accountDatabaseNameForFingerprint')) {
  fail('les bases de comptes ne sont plus dérivées d’une empreinte opaque.');
}

const registry = read('src/infrastructure/data-spaces/dataSpaceRegistry.ts');
for (const marker of [
  "'sportpilot:data-spaces:v1'",
  'accountFingerprint',
  'linkedToCurrentDevice',
]) {
  if (!registry.includes(marker)) {
    fail(`le registre local ne contient pas le marqueur ${marker}.`);
  }
}
if (/candidate\.email|space\.email|accountEmail/.test(registry)) {
  fail('le registre local ne doit pas stocker une adresse email de compte.');
}

const gate = read('src/app/data-spaces/DataSpaceAccountGate.tsx');
for (const marker of [
  "currentSpace.accountFingerprint === accountFingerprint",
  'status: "choice"',
  'currentSpace.kind === "account"',
  'setState({ status: "ready" })',
]) {
  if (!gate.includes(marker)) {
    fail(`la barrière de compte ne contient plus le garde-fou ${marker}.`);
  }
}
if (gate.includes('activateGuestDataSpace')) {
  fail('la barrière de compte ne doit jamais activer implicitement l’espace invité.');
}

const socialGate = read(
  'src/app/social-identity/SocialIdentityAccountGate.tsx',
);
for (const marker of [
  'ensureValidCloudCredentials',
  'CloudAccountAccessError',
  'Se reconnecter',
  'Continuer hors ligne',
]) {
  if (!socialGate.includes(marker)) {
    fail(`la restauration sociale ne contient plus le garde-fou ${marker}.`);
  }
}
if (socialGate.includes('activateGuestDataSpace') || socialGate.includes('.logout()')) {
  fail('une erreur d’identité sociale ne doit ni déconnecter ni activer l’espace invité.');
}

const accountManagement = read(
  'src/infrastructure/data-spaces/accountDeviceManagementService.ts',
);
for (const marker of [
  'detachCurrentDeviceFromAccount',
  'await client.logout()',
  'detachAccountDataSpaceFromCurrentDevice',
]) {
  if (!accountManagement.includes(marker)) {
    fail(`le passage explicite en mode invité ne contient plus ${marker}.`);
  }
}

const accountDevicesPage = read(
  'src/features/account-devices/pages/AccountDevicesPage.tsx',
);
for (const marker of [
  'Utiliser le mode invité',
  'Utiliser le mode invité sur cet appareil ?',
  'L’espace local du compte et ses données ne seront ni supprimés ni déplacés.',
]) {
  if (!accountDevicesPage.includes(marker)) {
    fail(`la confirmation du mode invité ne contient plus ${marker}.`);
  }
}

const service = read('src/infrastructure/data-spaces/accountDataSpaceService.ts');
for (const marker of [
  "sourceSpace.kind !== 'guest'",
  'sourceDatabase.name === targetDatabaseName',
  'Un espace local existe déjà pour ce compte',
]) {
  if (!service.includes(marker)) {
    fail(`le service de rattachement ne contient plus le garde-fou ${marker}.`);
  }
}

const isolationTest = read(
  'src/infrastructure/data-spaces/accountDataIsolation.integration.test.ts',
);
for (const marker of [
  'Compte A',
  'Compte B',
  'espace invité',
  'empêche les données du compte A',
]) {
  if (!isolationTest.includes(marker)) {
    fail(`le test d’intégration ne couvre plus ${marker}.`);
  }
}

console.log(
  'Audit isolation des comptes réussi : barrière avant providers, bases distinctes, rattachement invité uniquement et test compte A/compte B présents.',
);
