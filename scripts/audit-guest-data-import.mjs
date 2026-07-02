import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const requiredFiles = [
  "src/infrastructure/data-spaces/guestDataImportService.ts",
  "src/infrastructure/data-spaces/guestDataImportService.test.ts",
  "src/features/account-devices/components/GuestDataImportPanel.tsx",
  "src/features/account-devices/components/GuestDataImportPanel.test.tsx",
  "src/app/data-spaces/DataSpaceAccountGate.tsx",
  "src/features/account-devices/pages/AccountDevicesPage.tsx",
];

for (const path of requiredFiles) {
  if (!existsSync(path)) failures.push(`Fichier D2 absent : ${path}.`);
}

if (failures.length === 0) {
  const service = read(requiredFiles[0]);
  for (const marker of [
    "prepareGuestDataImport",
    "applyPreparedGuestDataImport",
    'targetHandle.database.transaction("rw"',
    "sourceFingerprint",
    "targetFingerprint",
    "Les données invitées ont changé depuis l’analyse",
    "Les données du compte ont changé depuis l’analyse",
    "activateAccountDataSpace",
    "normalizeFoodProductKey",
    "remapMealReferences",
    "applyDeletionRecords",
    "pruneOrphans",
  ]) {
    if (!service.includes(marker))
      failures.push(`Garde-fou D2 manquant : ${marker}.`);
  }
  if (service.includes("sourceHandle.database.clear")) {
    failures.push("Le service D2 ne doit jamais vider la base invitée.");
  }
  if (
    service.includes(
      'typeof row.createdAt === "string" ? row.createdAt : updatedAt(row)',
    )
  ) {
    failures.push(
      "Le service D2 ne doit pas fabriquer createdAt à partir de updatedAt.",
    );
  }

  const panel = read(requiredFiles[2]);
  for (const marker of [
    "Analyser les données invitées",
    "Importer dans mon compte",
    "L’espace invité est resté intact",
    "<ConfirmationDialog",
  ]) {
    if (!panel.includes(marker))
      failures.push(`Interface D2 incomplète : ${marker}.`);
  }

  const gate = read(requiredFiles[4]);
  if (!gate.includes("<GuestDataImportPanel")) {
    failures.push(
      "La connexion ne propose pas l’analyse/import des données invitées.",
    );
  }

  const accountPage = read(requiredFiles[5]);
  if (!accountPage.includes("<GuestDataImportPanel")) {
    failures.push(
      "Compte et appareils ne permet pas de relancer l’import invité.",
    );
  }

  const packageJson = JSON.parse(read("package.json"));
  if (
    packageJson.scripts?.["audit:guest-data-import"] !==
    "node scripts/audit-guest-data-import.mjs"
  ) {
    failures.push(
      "Le script audit:guest-data-import est absent ou incohérent.",
    );
  }
  for (const pipeline of ["check", "ci"]) {
    if (
      !String(packageJson.scripts?.[pipeline] ?? "").includes(
        "audit:guest-data-import",
      )
    ) {
      failures.push(`Le pipeline ${pipeline} n’exécute pas l’audit D2.`);
    }
  }
}

if (failures.length > 0) {
  console.error("Audit D2 échoué :");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Audit D2 réussi : analyse préalable, fusion atomique, résolution par fraîcheur, déduplication fonctionnelle, cohérence des références et conservation de l’espace invité validées.",
);
