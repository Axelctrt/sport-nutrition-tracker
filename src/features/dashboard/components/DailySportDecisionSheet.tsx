import { Clock3, Dumbbell, Moon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  SetDailyActivityDecisionInput,
} from '@/application/daily/dailyCoachingService';
import type { DailyActivityDecision } from '@/domain/models/dailyCoaching';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { ChoiceCard, ChoiceCardGroup } from '@/shared/ui/ChoiceCard';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface DailySportDecisionSheetProps {
  open: boolean;
  date: string;
  decision?: DailyActivityDecision;
  plannedCount: number;
  onClose: () => void;
  onSubmit: (input: SetDailyActivityDecisionInput) => Promise<void>;
}

export function DailySportDecisionSheet({
  open,
  date,
  decision,
  plannedCount,
  onClose,
  onSubmit,
}: DailySportDecisionSheetProps) {
  const [value, setValue] = useState<DailyActivityDecision['decision']>('open');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setValue(
      decision?.decision
      ?? (plannedCount > 0 ? 'activities' : 'open'),
    );
    setErrorMessage(undefined);
  }, [decision, open, plannedCount]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(undefined);
    try {
      await onSubmit({ date, decision: value });
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'La décision sportive n’a pas pu être enregistrée.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      title="Sport aujourd’hui"
      description="Confirme simplement ton intention. Tu pourras toujours changer d’avis."
      onClose={onClose}
      footer={(
        <Button
          type="submit"
          form="daily-sport-decision-form"
          fullWidth
          loading={isSubmitting}
          loadingLabel="Enregistrement…"
        >
          Confirmer
        </Button>
      )}
    >
      <form id="daily-sport-decision-form" onSubmit={handleSubmit}>
        {errorMessage ? (
          <InlineNotice className="mb-4" tone="error" title="Enregistrement impossible" role="alert">
            {errorMessage}
          </InlineNotice>
        ) : null}
        <ChoiceCardGroup label="As-tu prévu une activité aujourd’hui ?" columns={1}>
          <ChoiceCard
            name="daily-sport-decision"
            value="rest"
            title="Repos"
            description="Aucune activité sportive prévue."
            icon={Moon}
            selected={value === 'rest'}
            onSelect={() => setValue('rest')}
            comfortable
          />
          <ChoiceCard
            name="daily-sport-decision"
            value="activities"
            title="Une ou plusieurs activités"
            description={
              plannedCount > 0
                ? `${plannedCount} activité${plannedCount > 1 ? 's' : ''} déjà prévue${plannedCount > 1 ? 's' : ''}.`
                : 'Musculation, course, vélo, natation ou autre.'
            }
            icon={Dumbbell}
            selected={value === 'activities'}
            onSelect={() => setValue('activities')}
            comfortable
          />
          <ChoiceCard
            name="daily-sport-decision"
            value="open"
            title="Je déciderai plus tard"
            description="La section restera disponible sans bloquer la journée."
            icon={Clock3}
            selected={value === 'open'}
            onSelect={() => setValue('open')}
            comfortable
          />
        </ChoiceCardGroup>
      </form>
    </BottomSheet>
  );
}
