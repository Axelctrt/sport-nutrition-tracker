import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createActivityFromDraft,
  updateActivityFromDraft,
} from '@/application/activities/activityService';
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import type { Activity, ActivityType } from '@/domain/models/activity';
import type { AppSettings } from '@/domain/models/settings';
import { ActivityForm } from '@/features/activities/components/ActivityForm';
import {
  createActivityJournalFeedbackState,
  createActivityJournalRestoreState,
  type ActivityJournalNavigationState,
} from '@/features/activities/navigation/activityJournalNavigation';
import type { ActivityFormValues } from '@/features/activities/schemas/activityFormSchema';
import {
  activityToFormValues,
  defaultActivityFormValues,
  toActivityDraft,
} from '@/features/activities/utils/activityForm';
import { activityTypeLabels } from '@/features/activities/utils/activityLabels';
import { repositories } from '@/infrastructure/repositories/repositories';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { isValidLocalDate } from '@/shared/validation/localDate';

interface AddActivityEditorPageProps {
  initialType: ActivityType;
  allowedTypes: readonly ActivityType[];
  title: string;
  description: string;
}

interface EditorState {
  settings: AppSettings;
  initialValues: ActivityFormValues;
  existingActivity?: Activity;
}

function ActivityEditor({
  initialType,
  allowedTypes,
  title,
  description,
  activityId,
}: AddActivityEditorPageProps & { activityId?: string }) {
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as ActivityJournalNavigationState | null;
  const returnContext = navigationState?.activityJournalReturn;
  const [state, setState] = useState<EditorState>();
  const [selectedDate, setSelectedDate] = useState('');
  const [calculationWeightKg, setCalculationWeightKg] = useState(profile?.initialWeightKg ?? 0);
  const [calculationWeightSource, setCalculationWeightSource] = useState('poids initial du profil');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(undefined);
      try {
        const [settings, existingActivity] = await Promise.all([
          repositories.settings.get(),
          activityId ? repositories.activities.getById(activityId) : Promise.resolve(undefined),
        ]);

        if (activityId && !existingActivity) {
          throw new Error('Cette activité est introuvable ou a déjà été supprimée.');
        }

        const initialValues = existingActivity
          ? activityToFormValues(existingActivity)
          : defaultActivityFormValues(initialType, settings);

        if (active) {
          setState({
            settings,
            initialValues,
            ...(existingActivity ? { existingActivity } : {}),
          });
          setSelectedDate(initialValues.date);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Le formulaire de l’activité ne peut pas être chargé.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [activityId, initialType]);

  useEffect(() => {
    if (!profile || !isValidLocalDate(selectedDate)) {
      return;
    }

    let active = true;
    const loadWeight = async () => {
      try {
        const entry = await repositories.weight.getLatestOnOrBefore(selectedDate);
        if (active) {
          setCalculationWeightKg(entry?.weightKg ?? profile.initialWeightKg);
          setCalculationWeightSource(
            entry
              ? `pesée du ${entry.date.split('-').reverse().join('/')}`
              : 'poids initial du profil',
          );
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Le poids applicable ne peut pas être chargé.',
          );
        }
      }
    };

    void loadWeight();
    return () => {
      active = false;
    };
  }, [profile, selectedDate]);

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleSubmit = async (values: ActivityFormValues) => {
    if (!profile) {
      return;
    }

    setErrorMessage(undefined);
    try {
      const draft = toActivityDraft(values);
      const saved = state?.existingActivity
        ? await updateActivityFromDraft(state.existingActivity.id, draft, profile)
        : await createActivityFromDraft(draft, profile);
      const canReturnToOrigin = returnContext?.date === values.date;
      const destination = canReturnToOrigin
        ? returnContext.path
        : `${routePaths.activities}?date=${encodeURIComponent(values.date)}`;
      const feedbackTitle = state?.existingActivity ? 'Activité modifiée' : 'Activité ajoutée';

      const destinationState = createActivityJournalFeedbackState(
        returnContext,
        {
          title: feedbackTitle,
          activityId: saved.id,
        },
        values.date,
      );

      navigate(destination, { state: destinationState });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'L’activité ne peut pas être enregistrée.',
      );
    }
  };

  const resolvedTitle = useMemo(() => {
    if (!state?.existingActivity) {
      return title;
    }
    return `Modifier : ${activityTypeLabels[state.existingActivity.type]}`;
  }, [state?.existingActivity, title]);

  const backPath = returnContext?.path
    ?? (state?.initialValues.date
      ? `${routePaths.activities}?date=${encodeURIComponent(state.initialValues.date)}`
      : routePaths.activities);

  return (
    <section aria-labelledby="activity-editor-title">
      <Link
        to={backPath}
        state={createActivityJournalRestoreState(returnContext)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour aux activités
      </Link>

      <div className="mt-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Journal sportif</p>
        <h1 id="activity-editor-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          {resolvedTitle}
        </h1>
        <p className="mt-2 hidden max-w-2xl text-slate-600 dark:text-slate-300 sm:block">{description}</p>
      </div>

      {loading ? <PageSkeleton className="mt-6" variant="form" /> : null}

      {errorMessage ? (
        <InlineNotice className="mt-5" tone="error" title="Enregistrement impossible" role="alert">
          {errorMessage}
        </InlineNotice>
      ) : null}

      {!loading && state && profile ? (
        <div className="mt-6">
          <ActivityForm
            initialValues={state.initialValues}
            allowedTypes={state.existingActivity ? [state.existingActivity.type] : allowedTypes}
            settings={state.settings}
            calculationWeightKg={calculationWeightKg}
            calculationWeightSource={calculationWeightSource}
            submitLabel={state.existingActivity ? 'Enregistrer les modifications' : 'Ajouter l’activité'}
            onDateChange={handleDateChange}
            onSubmit={handleSubmit}
          />
        </div>
      ) : null}
    </section>
  );
}

export function RunningActivityPage() {
  return (
    <ActivityEditor
      initialType="running"
      allowedTypes={['running']}
      title="Ajouter une course"
      description="Renseigne la distance, la durée et la cadence. L’allure, les pas de course et la dépense sont calculés automatiquement."
    />
  );
}

export function SwimmingActivityPage() {
  return (
    <ActivityEditor
      initialType="swimming"
      allowedTypes={['swimming']}
      title="Ajouter une natation"
      description="Renseigne la distance, la nage principale et le type de séance pour calculer l’allure et la dépense."
    />
  );
}

export function StrengthActivityPage() {
  return (
    <ActivityEditor
      initialType="strengthTraining"
      allowedTypes={['strengthTraining']}
      title="Ajouter une musculation simple"
      description="Utilise ce formulaire pour une séance globale. Le carnet détaillé reste disponible pour suivre les exercices et les séries."
    />
  );
}

export function OtherActivityPage() {
  return (
    <ActivityEditor
      initialType="cycling"
      allowedTypes={['cycling', 'walking', 'otherCardio']}
      title="Ajouter une autre activité"
      description="Choisis entre vélo, marche et autre cardio, puis adapte la valeur MET à l’intensité réelle."
    />
  );
}

export function EditActivityPage() {
  const { activityId } = useParams<{ activityId: string }>();

  if (!activityId) {
    return (
      <InlineNotice tone="error" title="Identifiant manquant">
        Le lien de modification de cette activité est invalide.
      </InlineNotice>
    );
  }

  return (
    <ActivityEditor
      activityId={activityId}
      initialType="running"
      allowedTypes={['running']}
      title="Modifier une activité"
      description="Corrige les informations enregistrées. Les objectifs des journées concernées seront recalculés."
    />
  );
}
