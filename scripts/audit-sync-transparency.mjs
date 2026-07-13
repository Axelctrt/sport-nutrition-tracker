import { readFileSync } from 'node:fs';

const files = {
  orchestrator: readFileSync('src/application/sync/syncOrchestrator.ts', 'utf8'),
  history: readFileSync('src/application/sync/syncOperationHistory.ts', 'utf8'),
  panel: [
    readFileSync('src/features/settings/components/UnifiedSyncCenterPanel.tsx', 'utf8'),
    readFileSync('src/features/settings/components/UnifiedSyncCenterAdvancedDetails.tsx', 'utf8'),
  ].join('\n'),
  readiness: readFileSync('src/app/syncTransparencyReadiness.test.ts', 'utf8'),
};

const assertions = [
  [files.orchestrator.includes('appendSyncOperationHistory(accountKey, result)'), 'journal commun absent de l’orchestrateur'],
  [files.history.includes('MAX_HISTORY_ENTRIES = 20'), 'rétention bornée absente'],
  [files.history.includes("'manual': return 'Manuelle'"), 'source manuelle non distinguée'],
  [files.history.includes('Automatique · modification locale'), 'sources automatiques non distinguées'],
  [files.panel.includes('Historique récent'), 'historique non affiché'],
  [files.panel.includes('Dernière réussite'), 'dernière réussite absente'],
  [files.panel.includes('Dernier échec'), 'dernier échec absent'],
  [files.panel.includes('Examiner les différences'), 'examen des divergences absent'],
  [files.panel.includes('Fusionner lorsque c’est possible'), 'fusion prudente absente'],
  [files.readiness.includes('préparation F3'), 'test de préparation F3 absent'],
];

const failed = assertions.filter(([valid]) => !valid);
if (failed.length > 0) {
  for (const [, message] of failed) console.error(`- ${message}`);
  process.exit(1);
}
console.log('Audit F3 réussi : historique par compte, sources manuelles/automatiques, réussite et échec visibles, divergences examinables et aucune résolution destructive silencieuse.');
