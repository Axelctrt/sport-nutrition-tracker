import { Activity, Footprints, Utensils } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  CompleteDailyCheckOutInput,
} from '@/application/daily/dailyCoachingService';
import type { DailyCheckOut, DailyContextFlag } from '@/domain/models/dailyCoaching';
import { DailyContextFlagsField } from '@/features/dashboard/components/DailyContextFlagsField';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';
import { FirstUseHint } from '@/shared/ui/FirstUseHint';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';

interface DailyCheckOutSheetProps {
  open: boolean;
  date: string;
  checkOut?: DailyCheckOut;
  actualSteps?: number;
  foodJournalComplete: boolean;
  consumedCaloriesKcal: number;
  completedActivityCount: number;
  unresolvedPlannedCount: number;
  onClose: () => void;
  onSubmit: (input: CompleteDailyCheckOutInput) => Promise<void>;
}

type StepsMode = 'record' | 'skip';

export function DailyCheckOutSheet({
  open,
  date,
  checkOut,
  actualSteps,
  foodJournalComplete,
  consumedCaloriesKcal,
  completedActivityCount,
  unresolvedPlannedCount,
  onClose,
  onSubmit,
}: DailyCheckOutSheetProps) {
  const [stepsMode, setStepsMode] = useState<StepsMode>('skip');
  const [steps, setSteps] = useState('');
  const [hunger, setHunger] = useState<'low' | 'normal' | 'high'>('normal');
  const [energy, setEnergy] = useState<'low' | 'normal' | 'high'>('normal');
  const [journalComplete, setJournalComplete] = useState(false);
  const [contextFlags, setContextFlags] = useState<DailyContextFlag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [stepsError, setStepsError] = useState<string>();
  const stepsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStepsMode(actualSteps === undefined && !checkOut?.stepsEntryId ? 'skip' : 'record');
    setSteps(actualSteps === undefined ? '' : String(actualSteps));
    setHunger(checkOut?.hunger ?? 'normal');
    setEnergy(checkOut?.energy ?? 'normal');
    setJournalComplete(checkOut?.foodJournalComplete ?? foodJournalComplete);
    setContextFlags([...(checkOut?.contextFlags ?? [])]);
    setErrorMessage(undefined);
    setStepsError(undefined);
  }, [actualSteps, checkOut, foodJournalComplete, open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedSteps = Number(steps);
    if (
      stepsMode === 'record'
      && (!Number.isInteger(parsedSteps) || parsedSteps < 0 || parsedSteps > 100_000)
    ) {
      setStepsError('Indique un nombre de pas compris entre 0 et 100 000, ou choisis de les ignorer.');
      window.requestAnimationFrame(() => {
        stepsInputRef.current?.focus({ preventScroll: true });
        stepsInputRef.current?.scrollIntoView?.({ block: 'center' });
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);
    setStepsError(undefined);
    try {
      await onSubmit({
        date,
        actualSteps: stepsMode === 'record' ? parsedSteps : null,
        hunger,
        energy,
        foodJournalComplete: journalComplete,
        contextFlags,
      });
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Le check-out n’a pas pu être enregistré.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      title={checkOut ? 'Modifier le check-out' : 'Check-out du soir'}
      description="Confirme ce qui est déjà connu et termine en quelques secondes."
      onClose={onClose}
      footer={(
        <Button
          type="submit"
          form="daily-check-out-form"
          fullWidth
          loading={isSubmitting}
          loadingLabel="Clôture…"
        >
          Clôturer la journée
        </Button>
      )}
    >
      <form id="daily-check-out-form" className="space-y-5" onSubmit={handleSubmit} noValidate>
        <FirstUseHint hintKey="daily-check-out" title="Finaliser le bilan">
          Le check-out utilise tes pas réels pour finaliser le bilan de la journée.
        </FirstUseHint>

        {errorMessage ? (
          <InlineNotice tone="error" title="Saisie à vérifier" role="alert">
            {errorMessage}
          </InlineNotice>
        ) : null}

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Utensils aria-hidden="true" className="size-3.5" />
              Nutrition
            </p>
            <p className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">
              {Math.round(consumedCaloriesKcal).toLocaleString('fr-FR')} kcal
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Activity aria-hidden="true" className="size-3.5" />
              Activités terminées
            </p>
            <p className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">
              {completedActivityCount}
            </p>
          </div>
        </div>

        {unresolvedPlannedCount > 0 ? (
          <InlineNotice tone="warning" title="Activité encore prévue">
            {unresolvedPlannedCount} activité{unresolvedPlannedCount > 1 ? 's sont' : ' est'} encore
            marquée{unresolvedPlannedCount > 1 ? 's' : ''} comme prévue.
          </InlineNotice>
        ) : null}

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Footprints aria-hidden="true" className="size-4 text-brand-700 dark:text-brand-300" />
            Pas réels
          </div>
          <SegmentedControl
            label="Saisie des pas"
            value={stepsMode}
            items={[
              { value: 'record', label: 'Confirmer' },
              { value: 'skip', label: 'Ignorer' },
            ]}
            onChange={(value) => setStepsMode(value as StepsMode)}
          />
          {stepsMode === 'record' ? (
            <FormField
              id="daily-check-out-steps"
              label="Pas totaux"
              className="mt-3"
              error={stepsError}
            >
              {(controlProps) => <input
                ref={stepsInputRef}
                type="number"
                inputMode="numeric"
                min="0"
                max="100000"
                step="1"
                value={steps}
                onChange={(event) => {
                  setSteps(event.target.value);
                  setStepsError(undefined);
                }}
                className={inputClassName}
                {...controlProps}
              />}
            </FormField>
          ) : null}
        </div>

        <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Faim dans la journée
          </p>
          <SegmentedControl
            label="Faim dans la journée"
            value={hunger}
            items={[
              { value: 'low', label: 'Faible' },
              { value: 'normal', label: 'Normale' },
              { value: 'high', label: 'Forte' },
            ]}
            onChange={(value) => setHunger(value as typeof hunger)}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Énergie générale
          </p>
          <SegmentedControl
            label="Énergie générale"
            value={energy}
            items={[
              { value: 'low', label: 'Faible' },
              { value: 'normal', label: 'Normale' },
              { value: 'high', label: 'Bonne' },
            ]}
            onChange={(value) => setEnergy(value as typeof energy)}
          />
        </div>

        <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <input
            type="checkbox"
            className={checkboxClassName}
            checked={journalComplete}
            onChange={(event) => setJournalComplete(event.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
              Journal alimentaire complet
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              Toutes les consommations importantes sont enregistrées.
            </span>
          </span>
        </label>

        <DailyContextFlagsField value={contextFlags} onChange={setContextFlags} />
      </form>
    </BottomSheet>
  );
}
