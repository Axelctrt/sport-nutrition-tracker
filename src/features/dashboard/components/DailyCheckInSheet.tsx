import { MoonStar, Scale, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  CompleteDailyCheckInInput,
} from '@/application/daily/dailyCoachingService';
import type { DailyCheckIn, DailyContextFlag } from '@/domain/models/dailyCoaching';
import type { WeightEntry } from '@/domain/models/weight';
import { inputClassName } from '@/shared/forms/formStyles';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { DailyContextFlagsField } from '@/features/dashboard/components/DailyContextFlagsField';

interface DailyCheckInSheetProps {
  open: boolean;
  date: string;
  checkIn?: DailyCheckIn;
  weightEntry?: WeightEntry;
  fallbackWeightKg: number;
  onClose: () => void;
  onSubmit: (input: CompleteDailyCheckInInput) => Promise<void>;
}

type WeightMode = 'record' | 'skip';

export function DailyCheckInSheet({
  open,
  date,
  checkIn,
  weightEntry,
  fallbackWeightKg,
  onClose,
  onSubmit,
}: DailyCheckInSheetProps) {
  const [weightMode, setWeightMode] = useState<WeightMode>('record');
  const [weightKg, setWeightKg] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [sleepMinutes, setSleepMinutes] = useState('');
  const [sleepQuality, setSleepQuality] = useState<'poor' | 'average' | 'good'>('average');
  const [readiness, setReadiness] = useState<'low' | 'normal' | 'high'>('normal');
  const [waistCm, setWaistCm] = useState('');
  const [contextFlags, setContextFlags] = useState<DailyContextFlag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const waistInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const duration = checkIn?.sleepDurationMinutes;
    setWeightMode(checkIn && !checkIn.weightEntryId ? 'skip' : 'record');
    setWeightKg(String(weightEntry?.weightKg ?? fallbackWeightKg));
    setSleepHours(duration === undefined ? '' : String(Math.floor(duration / 60)));
    setSleepMinutes(duration === undefined ? '' : String(duration % 60));
    setSleepQuality(checkIn?.sleepQuality ?? 'average');
    setReadiness(checkIn?.readiness ?? 'normal');
    setWaistCm(checkIn?.waistCm === undefined ? '' : String(checkIn.waistCm));
    setContextFlags([...(checkIn?.contextFlags ?? [])]);
    setErrorMessage(undefined);
  }, [checkIn, fallbackWeightKg, open, weightEntry]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedWeight = Number(weightKg);
    const parsedHours = sleepHours.trim() ? Number(sleepHours) : 0;
    const parsedMinutes = sleepMinutes.trim() ? Number(sleepMinutes) : 0;
    const parsedWaist = waistCm.trim() ? Number(waistCm) : undefined;

    if (weightMode === 'record' && (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 500)) {
      setErrorMessage('Indique un poids compris entre 20 et 500 kg, ou choisis de ne pas te peser.');
      return;
    }
    if (
      !Number.isInteger(parsedHours)
      || parsedHours < 0
      || parsedHours > 24
      || !Number.isInteger(parsedMinutes)
      || parsedMinutes < 0
      || parsedMinutes > 59
    ) {
      setErrorMessage('Vérifie la durée de sommeil.');
      return;
    }
    if (parsedWaist !== undefined && (!Number.isFinite(parsedWaist) || parsedWaist < 30 || parsedWaist > 300)) {
      setErrorMessage('Le tour de taille doit être compris entre 30 et 300 cm.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);
    try {
      const hasSleep = sleepHours.trim().length > 0 || sleepMinutes.trim().length > 0;
      await onSubmit({
        date,
        weightKg: weightMode === 'record' ? parsedWeight : null,
        ...(hasSleep ? { sleepDurationMinutes: parsedHours * 60 + parsedMinutes } : {}),
        sleepQuality,
        readiness,
        ...(parsedWaist === undefined ? {} : { waistCm: parsedWaist }),
        contextFlags,
      });
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Le check-in n’a pas pu être enregistré.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      title={checkIn ? 'Modifier le check-in' : 'Check-in du matin'}
      description="Quelques repères rapides. Aucune réponse ne change seule ta cible calorique."
      onClose={onClose}
      footer={(
        <Button
          type="submit"
          form="daily-check-in-form"
          fullWidth
          loading={isSubmitting}
          loadingLabel="Enregistrement…"
        >
          Enregistrer le check-in
        </Button>
      )}
    >
      <form id="daily-check-in-form" className="space-y-5" onSubmit={handleSubmit} noValidate>
        {errorMessage ? (
          <InlineNotice tone="error" title="Saisie à vérifier" role="alert">
            {errorMessage}
          </InlineNotice>
        ) : null}

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Scale aria-hidden="true" className="size-4 text-brand-700 dark:text-brand-300" />
            Pesée
          </div>
          <SegmentedControl
            label="Choix de pesée"
            value={weightMode}
            items={[
              { value: 'record', label: 'Me peser' },
              { value: 'skip', label: 'Pas aujourd’hui' },
            ]}
            onChange={(value) => setWeightMode(value as WeightMode)}
          />
          {weightMode === 'record' ? (
            <FormField id="daily-check-in-weight" label="Poids" className="mt-3">
              <div className="relative">
                <input
                  id="daily-check-in-weight"
                  type="number"
                  inputMode="decimal"
                  min="20"
                  max="500"
                  step="0.1"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  className={`${inputClassName} pr-12`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  kg
                </span>
              </div>
            </FormField>
          ) : null}
        </div>

        <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <MoonStar aria-hidden="true" className="size-4 text-indigo-600 dark:text-indigo-300" />
            Sommeil
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="daily-check-in-sleep-hours" label="Heures" optionalLabel="facultatif">
              <input
                id="daily-check-in-sleep-hours"
                type="number"
                inputMode="numeric"
                min="0"
                max="24"
                step="1"
                value={sleepHours}
                onChange={(event) => setSleepHours(event.target.value)}
                className={inputClassName}
              />
            </FormField>
            <FormField id="daily-check-in-sleep-minutes" label="Minutes">
              <input
                id="daily-check-in-sleep-minutes"
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                step="1"
                value={sleepMinutes}
                onChange={(event) => setSleepMinutes(event.target.value)}
                className={inputClassName}
              />
            </FormField>
          </div>
          <SegmentedControl
            className="mt-3"
            label="Qualité du sommeil"
            value={sleepQuality}
            items={[
              { value: 'poor', label: 'Mauvaise' },
              { value: 'average', label: 'Moyenne' },
              { value: 'good', label: 'Bonne' },
            ]}
            onChange={(value) => setSleepQuality(value as typeof sleepQuality)}
          />
        </div>

        <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Sparkles aria-hidden="true" className="size-4 text-amber-600 dark:text-amber-300" />
            État général
          </div>
          <SegmentedControl
            label="État général"
            value={readiness}
            items={[
              { value: 'low', label: 'Fatigué' },
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'En forme' },
            ]}
            onChange={(value) => setReadiness(value as typeof readiness)}
          />
        </div>

        <details
          className="group rounded-xl border border-slate-200 dark:border-slate-800"
          onToggle={(event) => {
            if (!event.currentTarget.open) return;
            window.requestAnimationFrame(() => {
              waistInputRef.current?.focus({ preventScroll: true });
              waistInputRef.current?.scrollIntoView?.({
                behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
                  ? 'auto'
                  : 'smooth',
                block: 'center',
              });
            });
          }}
        >
          <summary className="min-h-12 cursor-pointer list-none px-3 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
            Tour de taille <span className="font-normal text-slate-500">(facultatif)</span>
          </summary>
          <div className="border-t border-slate-200 p-3 dark:border-slate-800">
            <FormField
              id="daily-check-in-waist"
              label="Tour de taille"
              description="Mesure toujours au même emplacement et dans des conditions comparables."
            >
              <div className="relative">
                <input
                  ref={waistInputRef}
                  id="daily-check-in-waist"
                  type="number"
                  inputMode="decimal"
                  min="30"
                  max="300"
                  step="0.1"
                  value={waistCm}
                  onChange={(event) => setWaistCm(event.target.value)}
                  className={`${inputClassName} pr-12`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  cm
                </span>
              </div>
            </FormField>
          </div>
        </details>

        <DailyContextFlagsField value={contextFlags} onChange={setContextFlags} />
      </form>
    </BottomSheet>
  );
}
