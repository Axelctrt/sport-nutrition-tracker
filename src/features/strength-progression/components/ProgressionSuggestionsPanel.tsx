import { Check, Clock3, TrendingUp, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProgressionDecision } from '@/application/strength/strengthProgressionService';
import type {
  ProgressionSuggestion,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface SuggestionCardProps {
  suggestion: ProgressionSuggestion;
  exerciseName: string;
  isBusy: boolean;
  onDecision: (
    suggestionId: string,
    decision: ProgressionDecision,
    acceptedLoadKg?: number,
  ) => Promise<unknown>;
}

function statusText(suggestion: ProgressionSuggestion): string | undefined {
  if (suggestion.status === 'accepted') {
    return `Charge cible mise à jour à ${suggestion.suggestedLoadKg} kg.`;
  }
  if (suggestion.status === 'rejected') {
    return 'Suggestion refusée. La charge cible du modèle est inchangée.';
  }
  if (suggestion.status === 'deferred') {
    return 'Décision reportée. Tu peux encore accepter ou refuser cette suggestion.';
  }
  return undefined;
}

function SuggestionCard({
  suggestion,
  exerciseName,
  isBusy,
  onDecision,
}: SuggestionCardProps) {
  const [selectedLoad, setSelectedLoad] = useState(String(suggestion.suggestedLoadKg));
  const isFinal = suggestion.status === 'accepted' || suggestion.status === 'rejected';

  useEffect(() => {
    setSelectedLoad(String(suggestion.suggestedLoadKg));
  }, [suggestion.suggestedLoadKg]);

  const acceptedLoad = Number(selectedLoad.replace(',', '.'));
  const canAccept = Number.isFinite(acceptedLoad) && acceptedLoad > suggestion.currentLoadKg;
  const status = statusText(suggestion);

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Objectif atteint
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
            {exerciseName}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Toutes les séries de travail prévues ont atteint la borne haute de répétitions
            sans dépasser le RPE maximal configuré.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Charge actuelle : {suggestion.currentLoadKg} kg
            </span>
            <span className="rounded-lg bg-emerald-100 px-2.5 py-1.5 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              Proposition : {suggestion.suggestedLoadKg} kg
            </span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Incrément : +{suggestion.incrementKg} kg
            </span>
          </div>
        </div>

        {!isFinal ? (
          <div className="w-full shrink-0 lg:w-72">
            <label
              htmlFor={`progression-load-${suggestion.id}`}
              className="text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              Charge cible retenue
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id={`progression-load-${suggestion.id}`}
                type="number"
                min={suggestion.currentLoadKg + 0.01}
                step="0.25"
                inputMode="decimal"
                value={selectedLoad}
                onChange={(event) => setSelectedLoad(event.target.value)}
                className={inputClassName}
              />
              <span className="font-semibold text-slate-600 dark:text-slate-300">kg</span>
            </div>
            {!canAccept ? (
              <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                La charge doit être supérieure à {suggestion.currentLoadKg} kg.
              </p>
            ) : null}
            <div className="mt-3 grid gap-2">
              <Button
                disabled={isBusy || !canAccept}
                onClick={() => void onDecision(suggestion.id, 'accepted', acceptedLoad)}
              >
                <Check aria-hidden="true" className="size-4" />
                Accepter cette charge
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  disabled={isBusy}
                  onClick={() => void onDecision(suggestion.id, 'deferred')}
                >
                  <Clock3 aria-hidden="true" className="size-4" />
                  Plus tard
                </Button>
                <Button
                  variant="danger"
                  disabled={isBusy}
                  onClick={() => void onDecision(suggestion.id, 'rejected')}
                >
                  <X aria-hidden="true" className="size-4" />
                  Refuser
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {status ? (
        <InlineNotice
          className="mt-4"
          tone={suggestion.status === 'accepted' ? 'success' : 'info'}
          title={suggestion.status === 'accepted' ? 'Progression appliquée' : 'Décision enregistrée'}
        >
          {status}
        </InlineNotice>
      ) : null}
    </Card>
  );
}

interface ProgressionSuggestionsPanelProps {
  suggestions: ProgressionSuggestion[];
  exercises: WorkoutSessionExercise[];
  action?: string | undefined;
  onDecision: (
    suggestionId: string,
    decision: ProgressionDecision,
    acceptedLoadKg?: number,
  ) => Promise<unknown>;
}

export function ProgressionSuggestionsPanel({
  suggestions,
  exercises,
  action,
  onDecision,
}: ProgressionSuggestionsPanelProps) {
  if (suggestions.length === 0) return null;

  const exerciseNames = new Map(
    exercises.map((exercise) => [exercise.id, exercise.exerciseNameSnapshot]),
  );
  const pendingCount = suggestions.filter(
    (suggestion) => suggestion.status === 'pending' || suggestion.status === 'deferred',
  ).length;

  return (
    <section className="mt-8" aria-labelledby="progression-suggestions-title">
      <div className="flex items-center gap-3">
        <TrendingUp aria-hidden="true" className="size-6 text-emerald-700 dark:text-emerald-300" />
        <div>
          <h2
            id="progression-suggestions-title"
            className="text-2xl font-bold text-slate-950 dark:text-white"
          >
            Suggestions de progression
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {pendingCount > 0
              ? `${pendingCount} décision${pendingCount > 1 ? 's' : ''} à prendre. Aucune charge n’est modifiée automatiquement.`
              : 'Toutes les suggestions de cette séance ont reçu une décision.'}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            exerciseName={exerciseNames.get(suggestion.sessionExerciseId) ?? 'Exercice'}
            isBusy={action === `progression:${suggestion.id}`}
            onDecision={onDecision}
          />
        ))}
      </div>
    </section>
  );
}
