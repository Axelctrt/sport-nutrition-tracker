import { Save, Target } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import {
  GOAL_METRIC_DEFINITIONS,
  getGoalMetricDefinition,
  type Goal,
  type GoalMetric,
} from '@/domain/goals/goalState';
import {
  saveGoal,
  type GoalInput,
} from '@/application/goals/goalProgressService';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface GoalEditorProps {
  goal?: Goal;
  onSaved: () => void;
  onCancelEdit?: () => void;
  saveGoalAction?: (
    input: GoalInput,
    goalId?: string,
  ) => Goal;
}

function localToday(): string {
  const now = new Date();
  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000,
  );
  return local.toISOString().slice(0, 10);
}

export function GoalEditor({
  goal,
  onSaved,
  onCancelEdit,
  saveGoalAction = saveGoal,
}: GoalEditorProps) {
  const [title, setTitle] = useState(goal?.title ?? '');
  const [metric, setMetric] = useState<GoalMetric>(
    goal?.metric ?? 'totalSteps',
  );
  const [targetValue, setTargetValue] = useState(
    String(
      goal?.targetValue ??
        getGoalMetricDefinition('totalSteps').defaultTarget,
    ),
  );
  const [startDate, setStartDate] = useState(
    goal?.startDate ?? localToday(),
  );
  const [deadline, setDeadline] = useState(
    goal?.deadline ?? '',
  );
  const [baselineValue, setBaselineValue] = useState(
    goal?.baselineValue !== undefined
      ? String(goal.baselineValue)
      : '',
  );
  const [error, setError] = useState<string>();

  const definition = useMemo(
    () => getGoalMetricDefinition(metric),
    [metric],
  );

  useEffect(() => {
    if (goal) return;

    setTargetValue(String(definition.defaultTarget));
    if (metric !== 'weightTarget') {
      setBaselineValue('');
    }
  }, [definition, goal, metric]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);

    try {
      const parsedTarget = Number(targetValue);
      const parsedBaseline =
        baselineValue.trim() === ''
          ? undefined
          : Number(baselineValue);

      saveGoalAction(
        {
          title,
          metric,
          targetValue: parsedTarget,
          startDate,
          ...(deadline ? { deadline } : {}),
          ...(parsedBaseline !== undefined
            ? { baselineValue: parsedBaseline }
            : {}),
        },
        goal?.id,
      );

      onSaved();

      if (!goal) {
        setTitle('');
        setTargetValue(
          String(definition.defaultTarget),
        );
        setDeadline('');
        setBaselineValue('');
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'L’objectif n’a pas pu être enregistré.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-3">
        <Target
          aria-hidden="true"
          className="mt-1 size-5 text-brand-700 dark:text-brand-300"
        />
        <div>
          <h3 className="font-bold text-slate-950 dark:text-white">
            {goal
              ? 'Modifier cet objectif'
              : 'Nouvel objectif'}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            La progression sera calculée depuis les données déjà
            enregistrées dans SportPilot.
          </p>
        </div>
      </div>

      {error ? (
        <InlineNotice
          tone="error"
          title="Objectif invalide"
        >
          {error}
        </InlineNotice>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-900 dark:text-white">
          Type d’objectif
          <select
            value={metric}
            onChange={(event) =>
              setMetric(event.target.value as GoalMetric)
            }
            className={`${inputClassName} mt-2`}
          >
            {GOAL_METRIC_DEFINITIONS.map((item) => (
              <option
                key={item.metric}
                value={item.metric}
              >
                {item.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
            {definition.description}
          </span>
        </label>

        <label className="text-sm font-semibold text-slate-900 dark:text-white">
          Nom personnalisé
          <input
            value={title}
            maxLength={120}
            placeholder={definition.label}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            className={`${inputClassName} mt-2`}
          />
        </label>

        <label className="text-sm font-semibold text-slate-900 dark:text-white">
          Cible ({definition.unit})
          <input
            type="number"
            min={definition.step}
            step={definition.step}
            required
            value={targetValue}
            onChange={(event) =>
              setTargetValue(event.target.value)
            }
            className={`${inputClassName} mt-2`}
          />
        </label>

        {metric === 'weightTarget' ? (
          <label className="text-sm font-semibold text-slate-900 dark:text-white">
            Poids de départ (kg)
            <input
              type="number"
              min="20"
              max="400"
              step="0.1"
              required
              value={baselineValue}
              onChange={(event) =>
                setBaselineValue(event.target.value)
              }
              className={`${inputClassName} mt-2`}
            />
          </label>
        ) : null}

        <label className="text-sm font-semibold text-slate-900 dark:text-white">
          Date de départ
          <input
            type="date"
            required
            value={startDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
            className={`${inputClassName} mt-2`}
          />
        </label>

        <label className="text-sm font-semibold text-slate-900 dark:text-white">
          Échéance facultative
          <input
            type="date"
            min={startDate}
            value={deadline}
            onChange={(event) =>
              setDeadline(event.target.value)
            }
            className={`${inputClassName} mt-2`}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit">
          <Save aria-hidden="true" className="size-4" />
          {goal ? 'Enregistrer les modifications' : 'Créer l’objectif'}
        </Button>

        {goal && onCancelEdit ? (
          <Button
            variant="secondary"
            onClick={onCancelEdit}
          >
            Annuler
          </Button>
        ) : null}
      </div>
    </form>
  );
}
