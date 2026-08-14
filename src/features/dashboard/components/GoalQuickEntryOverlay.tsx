import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import type { NewEntity } from '@/domain/models/common';
import type { DailySteps } from '@/domain/models/steps';
import type { WeightEntry } from '@/domain/models/weight';
import { DashboardQuickEntryDialog } from '@/features/dashboard/components/DashboardQuickEntryDialog';
import { StepsForm } from '@/features/steps/components/StepsForm';
import type { StepsFormValues } from '@/features/steps/schemas/stepsSchema';
import { WeightEntryForm } from '@/features/weight/components/WeightEntryForm';
import type { WeightEntryFormValues } from '@/features/weight/schemas/weightEntrySchema';
import { useActionToast } from '@/shared/toast/useActionToast';
import { InlineNotice } from '@/shared/ui/InlineNotice';

type GoalQuickEntry = 'steps' | 'weight';

interface GoalQuickEntryOverlayProps {
  date: string;
  snapshot: DailyTargetSnapshot;
  onSaveWeight: (data: NewEntity<WeightEntry>) => Promise<void>;
  onSaveSteps: (data: NewEntity<DailySteps>) => Promise<void>;
}

function readQuickEntry(value: string | null): GoalQuickEntry | undefined {
  return value === 'steps' || value === 'weight' ? value : undefined;
}

export function GoalQuickEntryOverlay({
  date,
  snapshot,
  onSaveWeight,
  onSaveSteps,
}: GoalQuickEntryOverlayProps) {
  const actionToast = useActionToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>();
  const quickEntry = readQuickEntry(searchParams.get('action'));
  const stepsEntry = snapshot.stepsEntry;
  const weightEntry = snapshot.dateWeightEntry;

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('action');
    setErrorMessage(undefined);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleStepsSubmit = async (values: StepsFormValues) => {
    setErrorMessage(undefined);

    try {
      await onSaveSteps({
        date,
        totalSteps: values.totalSteps,
        source: 'manual',
      });
      actionToast.success({
        key: `goal-action-steps:${date}`,
        title: 'Pas enregistrés',
        description: 'La progression de l’objectif sera recalculée avec les pas du jour.',
      });
      close();
    } catch (error) {
      const fallback = 'Les pas n’ont pas pu être enregistrés.';
      setErrorMessage(error instanceof Error ? error.message : fallback);
    }
  };

  const handleWeightSubmit = async (values: WeightEntryFormValues) => {
    setErrorMessage(undefined);

    try {
      await onSaveWeight({
        date,
        weightKg: values.weightKg,
        ...(values.note.trim() ? { note: values.note.trim() } : {}),
      });
      actionToast.success({
        key: `goal-action-weight:${date}`,
        title: 'Poids enregistré',
        description: 'La progression des objectifs de poids et de pesée sera recalculée.',
      });
      close();
    } catch (error) {
      const fallback = 'La pesée n’a pas pu être enregistrée.';
      setErrorMessage(error instanceof Error ? error.message : fallback);
    }
  };

  return (
    <>
      <DashboardQuickEntryDialog
        open={quickEntry === 'steps'}
        title="Saisir les pas"
        description={`Actuellement ${(stepsEntry?.totalSteps ?? 0).toLocaleString('fr-FR')} pas enregistrés aujourd’hui.`}
        onClose={close}
      >
        {errorMessage ? (
          <InlineNotice
            className="mb-4"
            tone="error"
            title="Enregistrement impossible"
            role="alert"
          >
            {errorMessage}
          </InlineNotice>
        ) : null}
        <StepsForm
          key={stepsEntry?.updatedAt ?? 'no-steps'}
          formId="goal-action-steps-form"
          initialSteps={stepsEntry?.totalSteps ?? 0}
          submitLabel="Enregistrer"
          showDescription={false}
          onSubmit={handleStepsSubmit}
        />
      </DashboardQuickEntryDialog>

      <DashboardQuickEntryDialog
        open={quickEntry === 'weight'}
        title="Ajouter une pesée"
        description={weightEntry
          ? `${weightEntry.weightKg.toLocaleString('fr-FR')} kg sont déjà enregistrés aujourd’hui.`
          : 'Aucune pesée n’est encore enregistrée aujourd’hui.'}
        onClose={close}
      >
        {errorMessage ? (
          <InlineNotice
            className="mb-4"
            tone="error"
            title="Enregistrement impossible"
            role="alert"
          >
            {errorMessage}
          </InlineNotice>
        ) : null}
        <WeightEntryForm
          key={`${date}-${weightEntry?.updatedAt ?? 'profile'}`}
          formId="goal-action-weight-form"
          showDate={false}
          showNote={false}
          submitLabel="Enregistrer"
          initialValues={{
            date,
            weightKg: weightEntry?.weightKg ?? snapshot.weight.weightKg,
            note: weightEntry?.note ?? '',
          }}
          onSubmit={handleWeightSubmit}
        />
      </DashboardQuickEntryDialog>
    </>
  );
}
