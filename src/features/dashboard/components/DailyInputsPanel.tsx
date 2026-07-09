import { useState } from 'react';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import type { NewEntity } from '@/domain/models/common';
import type { DailySteps } from '@/domain/models/steps';
import type { WeightEntry } from '@/domain/models/weight';
import { StepsForm } from '@/features/steps/components/StepsForm';
import type { StepsFormValues } from '@/features/steps/schemas/stepsSchema';
import { WeightEntryForm } from '@/features/weight/components/WeightEntryForm';
import type { WeightEntryFormValues } from '@/features/weight/schemas/weightEntrySchema';
import { weightFormValuesToEntity } from '@/features/weight/utils';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { useActionToast } from '@/shared/toast/useActionToast';

interface DailyInputsPanelProps {
  snapshot: DailyTargetSnapshot;
  onSaveWeight: (entry: NewEntity<WeightEntry>) => Promise<void>;
  onSaveSteps: (entry: NewEntity<DailySteps>) => Promise<void>;
}

type Feedback = {
  tone: 'success' | 'error';
  message: string;
} | undefined;

export function DailyInputsPanel({
  snapshot,
  onSaveWeight,
  onSaveSteps,
}: DailyInputsPanelProps) {
  const actionToast = useActionToast();
  const [weightFeedback, setWeightFeedback] = useState<Feedback>();
  const [stepsFeedback, setStepsFeedback] = useState<Feedback>();
  const weightEntry = snapshot.dateWeightEntry;

  const handleWeightSubmit = async (values: WeightEntryFormValues) => {
    setWeightFeedback(undefined);

    try {
      await onSaveWeight(weightFormValuesToEntity(values));
      const message = 'La pesée est enregistrée. Elle contribuera au poids de référence de la semaine suivante.';
      setWeightFeedback({ tone: 'success', message });
      actionToast.success({ key: 'dashboard-weight-save', title: 'Poids enregistré', description: message });
    } catch (error) {
      const fallback = 'La pesée n’a pas pu être enregistrée.';
      setWeightFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : fallback,
      });
      actionToast.error({ key: 'dashboard-weight-save', title: 'Enregistrement impossible', error, fallback });
    }
  };

  const handleStepsSubmit = async (values: StepsFormValues) => {
    setStepsFeedback(undefined);

    try {
      await onSaveSteps({
        date: snapshot.date,
        totalSteps: values.totalSteps,
        source: 'manual',
      });
      const message = 'Les pas et la dépense estimée ont été recalculés.';
      setStepsFeedback({ tone: 'success', message });
      actionToast.success({ key: 'dashboard-steps-save', title: 'Pas enregistrés', description: message });
    } catch (error) {
      const fallback = 'Les pas n’ont pas pu être enregistrés.';
      setStepsFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : fallback,
      });
      actionToast.error({ key: 'dashboard-steps-save', title: 'Enregistrement impossible', error, fallback });
    }
  };

  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Pesée du jour
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
            Renseigner le poids
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Les pesées de cette semaine servent à calculer le poids de référence de la semaine suivante.
          </p>
        </div>

        {weightFeedback ? (
          <InlineNotice
            className="mt-5"
            tone={weightFeedback.tone}
            title={weightFeedback.tone === 'success' ? 'Poids enregistré' : 'Enregistrement impossible'}
            role={weightFeedback.tone === 'error' ? 'alert' : 'status'}
          >
            {weightFeedback.message}
          </InlineNotice>
        ) : null}

        <div className="mt-5">
          <WeightEntryForm
            key={`${snapshot.date}-${weightEntry?.updatedAt ?? 'profile'}`}
            formId="dashboard-weight-form"
            showDate={false}
            showNote={false}
            submitLabel="Enregistrer la pesée"
            initialValues={{
              date: snapshot.date,
              weightKg: snapshot.weight.weightKg,
              note: weightEntry?.note ?? '',
            }}
            onSubmit={handleWeightSubmit}
          />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Activité quotidienne
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
            Renseigner les pas
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Seuls les pas hors course dépassant le seuil de base génèrent une dépense supplémentaire.
          </p>
        </div>

        {stepsFeedback ? (
          <InlineNotice
            className="mt-5"
            tone={stepsFeedback.tone}
            title={stepsFeedback.tone === 'success' ? 'Pas enregistrés' : 'Enregistrement impossible'}
            role={stepsFeedback.tone === 'error' ? 'alert' : 'status'}
          >
            {stepsFeedback.message}
          </InlineNotice>
        ) : null}

        <div className="mt-5">
          <StepsForm
            key={snapshot.stepsEntry?.updatedAt ?? 'no-steps'}
            formId="dashboard-steps-form"
            initialSteps={snapshot.stepsEntry?.totalSteps ?? 0}
            onSubmit={handleStepsSubmit}
          />
        </div>
      </Card>
    </div>
  );
}
