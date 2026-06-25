import { Footprints, Scale } from 'lucide-react';
import { useState } from 'react';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import type { NewEntity } from '@/domain/models/common';
import type { DailySteps } from '@/domain/models/steps';
import type { WeightEntry } from '@/domain/models/weight';
import { StepsForm } from '@/features/steps/components/StepsForm';
import type { StepsFormValues } from '@/features/steps/schemas/stepsSchema';
import { WeightEntryForm } from '@/features/weight/components/WeightEntryForm';
import type { WeightEntryFormValues } from '@/features/weight/schemas/weightEntrySchema';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface DailyInputsPanelProps {
  snapshot: DailyTargetSnapshot;
  onSaveWeight: (data: NewEntity<WeightEntry>) => Promise<void>;
  onSaveSteps: (data: NewEntity<DailySteps>) => Promise<void>;
}

type Feedback = {
  tone: 'success' | 'error';
  message: string;
};

export function DailyInputsPanel({
  snapshot,
  onSaveWeight,
  onSaveSteps,
}: DailyInputsPanelProps) {
  const [weightFeedback, setWeightFeedback] = useState<Feedback>();
  const [stepsFeedback, setStepsFeedback] = useState<Feedback>();
  const weightEntry = snapshot.weight.source === 'weightEntry'
    && snapshot.weight.weightEntry.date === snapshot.date
    ? snapshot.weight.weightEntry
    : undefined;

  const handleWeightSubmit = async (values: WeightEntryFormValues) => {
    setWeightFeedback(undefined);

    try {
      await onSaveWeight({
        date: snapshot.date,
        weightKg: values.weightKg,
        ...(values.note.trim() ? { note: values.note.trim() } : {}),
      });
      setWeightFeedback({
        tone: 'success',
        message: 'Poids enregistré et objectifs recalculés.',
      });
    } catch (error) {
      setWeightFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'La pesée n’a pas pu être enregistrée.',
      });
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
      setStepsFeedback({
        tone: 'success',
        message: 'Pas enregistrés et dépense recalculée.',
      });
    } catch (error) {
      setStepsFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'Les pas n’ont pas pu être enregistrés.',
      });
    }
  };

  return (
    <section className="mt-6" aria-labelledby="daily-inputs-title">
      <div>
        <h2 id="daily-inputs-title" className="text-xl font-bold text-slate-950 dark:text-white">
          Mettre à jour la journée
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Les confirmations restent affichées ici, sans notification superposée.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card id="dashboard-steps-entry" className="scroll-mt-24 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <Footprints aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-white">Pas du jour</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Actuellement {snapshot.calculation.steps.totalSteps.toLocaleString('fr-FR')}
              </p>
            </div>
          </div>

          {stepsFeedback ? (
            <InlineNotice
              className="mt-4"
              tone={stepsFeedback.tone}
              title={stepsFeedback.tone === 'success' ? 'Pas enregistrés' : 'Enregistrement impossible'}
              role={stepsFeedback.tone === 'error' ? 'alert' : 'status'}
            >
              {stepsFeedback.message}
            </InlineNotice>
          ) : null}

          <div className="mt-4">
            <StepsForm
              key={snapshot.stepsEntry?.updatedAt ?? 'no-steps'}
              formId="dashboard-steps-form"
              initialSteps={snapshot.stepsEntry?.totalSteps ?? 0}
              submitLabel="Enregistrer"
              showDescription={false}
              onSubmit={handleStepsSubmit}
            />
          </div>
        </Card>

        <Card id="dashboard-weight-entry" className="scroll-mt-24 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              <Scale aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-white">Poids du jour</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {weightEntry
                  ? `${weightEntry.weightKg.toLocaleString('fr-FR')} kg enregistrés`
                  : 'Aucune pesée enregistrée aujourd’hui'}
              </p>
            </div>
          </div>

          {weightFeedback ? (
            <InlineNotice
              className="mt-4"
              tone={weightFeedback.tone}
              title={weightFeedback.tone === 'success' ? 'Poids enregistré' : 'Enregistrement impossible'}
              role={weightFeedback.tone === 'error' ? 'alert' : 'status'}
            >
              {weightFeedback.message}
            </InlineNotice>
          ) : null}

          <div className="mt-4">
            <WeightEntryForm
              key={`${snapshot.date}-${weightEntry?.updatedAt ?? 'profile'}`}
              formId="dashboard-weight-form"
              showDate={false}
              showNote={false}
              submitLabel="Enregistrer"
              initialValues={{
                date: snapshot.date,
                weightKg: weightEntry?.weightKg ?? snapshot.weight.weightKg,
                note: weightEntry?.note ?? '',
              }}
              onSubmit={handleWeightSubmit}
            />
          </div>
        </Card>
      </div>
    </section>
  );
}
