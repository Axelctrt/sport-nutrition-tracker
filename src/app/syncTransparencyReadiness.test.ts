import { describe, expect, it } from 'vitest';

import panelSource from '@/features/settings/components/UnifiedSyncCenterPanel.tsx?raw';
import orchestratorSource from '@/application/sync/syncOrchestrator.ts?raw';
import historySource from '@/application/sync/syncOperationHistory.ts?raw';

describe('préparation F3 — transparence de synchronisation', () => {
  it('journalise toutes les exécutions de l’orchestrateur', () => {
    expect(orchestratorSource).toContain('appendSyncOperationHistory(accountKey, result)');
    expect(historySource).toContain('MAX_HISTORY_ENTRIES = 20');
    expect(historySource).toContain('SYNC_OPERATION_HISTORY_CHANGED_EVENT');
  });

  it('affiche l’historique et distingue les sources', () => {
    expect(panelSource).toContain('Historique récent');
    expect(panelSource).toContain('syncSourceLabel(entry.source)');
    expect(panelSource).toContain('Dernière réussite');
    expect(panelSource).toContain('Dernier échec');
  });

  it('présente les divergences sans choix destructeur silencieux', () => {
    expect(panelSource).toContain('Examiner les différences');
    expect(panelSource).toContain('Fusionner lorsque c’est possible');
    expect(panelSource).toContain('ne remplace jamais silencieusement');
  });
});
