import { describe, expect, it } from 'vitest';

import goalEditorSource from '@/features/goals/components/GoalEditor.tsx?raw';
import goalEditorTestSource from '@/features/goals/components/GoalEditor.test.tsx?raw';
import goalsPageSource from '@/features/goals/pages/GoalsPage.tsx?raw';
import goalsPageTestSource from '@/features/goals/pages/GoalsPage.test.tsx?raw';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';

describe('correctif 0.26.0 — préremplissage fiable des objectifs', () => {
  it('conserve les versions de stockage sans migration', () => {
    expect(__APP_VERSION__).toBe('0.30.0');
    expect(databaseSchemaVersion).toBe(10);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(9);
  });

  it('réhydrate l’éditeur depuis l’objectif sélectionné en modification', () => {
    expect(goalEditorSource).toContain('setTitle(goal.title)');
    expect(goalEditorSource).toContain('setMetric(goal.metric)');
    expect(goalEditorSource).toContain('setTargetValue(String(goal.targetValue))');
    expect(goalEditorSource).toContain('setStartDate(goal.startDate)');
    expect(goalEditorSource).toContain("setDeadline(goal.deadline ?? '')");
    expect(goalEditorSource).toContain('formatOptionalNumber(goal.baselineValue)');
  });

  it('limite la dernière pesée au préremplissage des nouveaux objectifs de poids', () => {
    expect(goalsPageSource).toContain('loadLatestWeightBaselineFromRepository');
    expect(goalsPageSource).toContain('repositories.weight.listAll()');
    expect(goalsPageSource).toContain('initialWeightBaseline={latestWeightBaseline}');
    expect(goalEditorSource).toContain('initialBaselineForCreation');
    expect(goalEditorSource).toContain("if (goal) return;");
    expect(goalEditorSource).toContain("metric !== 'weightTarget'");
  });

  it('documente les scénarios de recette dans les tests ciblés', () => {
    expect(goalEditorTestSource).toContain('réhydrate tous les champs');
    expect(goalEditorTestSource).toContain('dernière pesée connue');
    expect(goalEditorTestSource).toContain('poids de départ historique');
    expect(goalsPageTestSource).toContain('loadLatestWeightBaseline');
  });
});
