import {
  CalendarRange,
  Copy,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  repeatTrainingWeek,
  type RepeatTrainingWeekResult,
} from '@/application/planning/repeatTrainingWeekService';
import {
  formatWeekRange,
  getWeekStart,
  shiftWeek,
} from '@/application/strength/weeklyPlanningService';
import type {
  LocalDate,
} from '@/domain/models/common';
import { repositories } from '@/infrastructure/repositories/repositories';
import { inputClassName } from '@/shared/forms/formStyles';
import { useToast } from '@/shared/toast/useToast';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface RepeatTrainingWeekPanelProps {
  weekStart: LocalDate;
  onOpenWeek: (date: LocalDate) => void;
  repeatWeek?: typeof repeatTrainingWeek;
}

function resultDescription(
  result: RepeatTrainingWeekResult,
): string {
  const created =
    result.createdStrengthCount +
    result.createdEnduranceCount;
  const ignored =
    result.ignoredStrengthCount +
    result.ignoredEnduranceCount;
  const parts = [
    `${created} séance${created > 1 ? 's' : ''} ajoutée${created > 1 ? 's' : ''}`,
  ];

  if (ignored > 0) {
    parts.push(
      `${ignored} doublon${ignored > 1 ? 's' : ''} ignoré${ignored > 1 ? 's' : ''}`,
    );
  }

  if (result.failedStrengthCount > 0) {
    parts.push(
      `${result.failedStrengthCount} séance${result.failedStrengthCount > 1 ? 's' : ''} de musculation indisponible${result.failedStrengthCount > 1 ? 's' : ''}`,
    );
  }

  return parts.join(' · ');
}

export function RepeatTrainingWeekPanel({
  weekStart,
  onOpenWeek,
  repeatWeek = repeatTrainingWeek,
}: RepeatTrainingWeekPanelProps) {
  const toast = useToast();
  const [targetDate, setTargetDate] =
    useState<LocalDate>(() =>
      shiftWeek(weekStart, 1),
    );
  const [confirmOpen, setConfirmOpen] =
    useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setTargetDate(shiftWeek(weekStart, 1));
  }, [weekStart]);

  const normalizedTarget = useMemo(() => {
    try {
      return getWeekStart(targetDate);
    } catch {
      return targetDate;
    }
  }, [targetDate]);

  const sameWeek =
    normalizedTarget === weekStart;

  const confirm = async () => {
    setBusy(true);
    setError(undefined);

    try {
      const result = await repeatWeek(
        {
          workoutSessions:
            repositories.workoutSessions,
          workoutTemplates:
            repositories.workoutTemplates,
          strengthExercises:
            repositories.strengthExercises,
        },
        weekStart,
        normalizedTarget,
      );
      const created =
        result.createdStrengthCount +
        result.createdEnduranceCount;

      if (created === 0) {
        toast.info(
          'Aucune nouvelle séance',
          resultDescription(result),
        );
      } else {
        toast.success(
          'Semaine répétée',
          resultDescription(result),
        );
      }

      setConfirmOpen(false);
      onOpenWeek(result.targetWeekStart);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'La semaine n’a pas pu être copiée.',
      );
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card
        className="mt-6 p-4 sm:p-5"
        aria-label="Répéter la semaine sportive"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            <CalendarRange
              aria-hidden="true"
              className="size-5"
            />
          </span>

          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">
              Répéter cette semaine
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Copie la structure de musculation et
              d’endurance vers une autre semaine.
              Les doublons déjà présents sont ignorés.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Semaine cible
            <input
              type="date"
              value={targetDate}
              onChange={(event) =>
                setTargetDate(event.target.value)
              }
              className={`${inputClassName} mt-1`}
            />
          </label>

          <Button
            size="lg"
            disabled={
              busy ||
              !targetDate ||
              sameWeek
            }
            onClick={() =>
              setConfirmOpen(true)
            }
          >
            <Copy
              aria-hidden="true"
              className="size-5"
            />
            {busy
              ? 'Copie…'
              : 'Copier la semaine'}
          </Button>
        </div>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Destination :{' '}
          <strong className="font-semibold text-slate-700 dark:text-slate-200">
            {targetDate
              ? formatWeekRange(normalizedTarget)
              : 'Choisis une date'}
          </strong>
        </p>

        {sameWeek ? (
          <InlineNotice
            className="mt-3"
            tone="info"
            title="Même semaine"
          >
            Choisis une semaine cible différente.
          </InlineNotice>
        ) : null}

        {error ? (
          <InlineNotice
            className="mt-3"
            tone="error"
            title="Copie impossible"
          >
            {error}
          </InlineNotice>
        ) : null}
      </Card>

      <ConfirmationDialog
        open={confirmOpen}
        title="Répéter cette semaine ?"
        description={`Les séances de ${formatWeekRange(
          weekStart,
        )} seront copiées vers ${formatWeekRange(
          normalizedTarget,
        )}. Les résultats et statuts passés ne seront pas copiés.`}
        confirmLabel={
          busy
            ? 'Copie en cours…'
            : 'Copier la semaine'
        }
        onConfirm={() => {
          void confirm();
        }}
        onCancel={() =>
          setConfirmOpen(false)
        }
      />
    </>
  );
}
