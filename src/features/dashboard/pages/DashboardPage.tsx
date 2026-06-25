import {
  Activity,
  Apple,
  Calculator,
  CircleAlert,
  Dumbbell,
  Flame,
  Footprints,
  LoaderCircle,
  Scale,
  Settings2,
  Utensils,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/app/providers/profile/useProfile';
import { editActivityPath, routePaths } from '@/app/routePaths';
import { presentActivity } from '@/features/activities/utils/activityPresentation';
import { DailyInputsPanel } from '@/features/dashboard/components/DailyInputsPanel';
import { useDailyDashboard } from '@/features/dashboard/hooks/useDailyDashboard';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { formatLocalDate } from '@/shared/utils/dates';

function roundKcal(value: number): number {
  return Math.round(value);
}

function MacroCard({
  label,
  value,
  unit = 'g',
  tone,
}: {
  label: string;
  value: number;
  unit?: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
      <div className={`h-1.5 w-10 rounded-full ${tone}`} aria-hidden="true" />
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">
        {value.toLocaleString('fr-FR')} {unit}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const { profile } = useProfile();
  const {
    date,
    status,
    snapshot,
    nutrition,
    errorMessage,
    refresh,
    saveWeight,
    saveSteps,
  } = useDailyDashboard();

  if (!profile) {
    return null;
  }

  const firstName = profile.firstName?.trim();

  return (
    <section aria-labelledby="dashboard-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Suivi du jour · {formatLocalDate(date, 'EEEE d MMMM')}
          </p>
          <h1 id="dashboard-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
            {firstName ? `Bonjour ${firstName}` : 'Tableau de bord'}
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            Les objectifs du jour sont calculés à partir du profil, du dernier poids connu, des pas et des activités enregistrées. Les résultats restent des estimations.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to={routePaths.weight}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Scale aria-hidden="true" className="size-4" />
            Historique du poids
          </Link>
          <Link
            to={routePaths.settings}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
          >
            <Settings2 aria-hidden="true" className="size-4" />
            Paramètres
          </Link>
        </div>
      </div>

      {status === 'loading' && !snapshot ? (
        <Card className="mt-8 p-8 text-center" role="status">
          <LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700 dark:text-brand-300" />
          <p className="mt-3 font-semibold text-slate-900 dark:text-white">Calcul des objectifs du jour…</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Lecture des données locales et génération du snapshot quotidien.
          </p>
        </Card>
      ) : null}

      {status === 'error' ? (
        <InlineNotice className="mt-8" tone="error" title="Tableau de bord indisponible" role="alert">
          <p>{errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {snapshot ? (
        <>
          {status === 'loading' ? (
            <InlineNotice className="mt-6" title="Mise à jour des calculs" role="status">
              Les données viennent d’être modifiées. Le snapshot quotidien est en cours de recalcul.
            </InlineNotice>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                <Flame aria-hidden="true" className="size-5" />
              </span>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Cible énergétique</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
                {snapshot.target.targetCaloriesKcal.toLocaleString('fr-FR')} kcal
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {snapshot.calculation.floorApplied
                  ? 'Plancher calorique appliqué'
                  : `${snapshot.target.goalAdjustmentKcal >= 0 ? '+' : ''}${roundKcal(snapshot.target.goalAdjustmentKcal)} kcal liés à l’objectif`}
              </p>
            </Card>

            <Card className="p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                <Calculator aria-hidden="true" className="size-5" />
              </span>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Dépense estimée</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
                {roundKcal(snapshot.target.energy.totalEstimatedExpenditureKcal).toLocaleString('fr-FR')} kcal
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Socle : {roundKcal(snapshot.target.energy.occupationalBaseKcal).toLocaleString('fr-FR')} kcal
              </p>
            </Card>

            <Card className="p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                <Scale aria-hidden="true" className="size-5" />
              </span>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Poids de calcul</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
                {snapshot.weight.weightKg.toLocaleString('fr-FR')} kg
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {snapshot.weight.source === 'weightEntry'
                  ? `Pesée du ${formatLocalDate(snapshot.weight.weightEntry.date)}`
                  : 'Poids initial du profil'}
              </p>
            </Card>

            <Card className="p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <Footprints aria-hidden="true" className="size-5" />
              </span>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Pas du jour</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
                {snapshot.calculation.steps.totalSteps.toLocaleString('fr-FR')}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Objectif : {profile.dailyStepGoal.toLocaleString('fr-FR')} pas
              </p>
              <ProgressBar
                className="mt-4"
                value={snapshot.calculation.steps.totalSteps}
                max={profile.dailyStepGoal}
                label="Progression des pas"
                indicatorClassName="bg-amber-600"
              />
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <Apple aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Objectifs de macronutriments</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Arrondis au multiple de 5 g</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MacroCard label="Protéines" value={snapshot.target.macros.proteinGrams} tone="bg-violet-600" />
                <MacroCard label="Glucides" value={snapshot.target.macros.carbohydratesGrams} tone="bg-amber-600" />
                <MacroCard label="Lipides" value={snapshot.target.macros.fatGrams} tone="bg-rose-600" />
              </div>
              {snapshot.calculation.macroDetails.carbohydratesClampedToZero ? (
                <InlineNotice className="mt-4" tone="info" title="Glucides ramenés à zéro">
                  Les objectifs de protéines et de lipides utilisent déjà toute la cible calorique disponible.
                </InlineNotice>
              ) : null}
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                  <Activity aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Détail de l’activité</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Prévention du double comptage incluse</p>
                </div>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600 dark:text-slate-300">Pas de course</dt>
                  <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">{snapshot.calculation.steps.runningSteps.toLocaleString('fr-FR')}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600 dark:text-slate-300">Pas hors course</dt>
                  <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">{snapshot.calculation.steps.nonRunningSteps.toLocaleString('fr-FR')}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600 dark:text-slate-300">Pas générant une dépense</dt>
                  <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">{snapshot.calculation.steps.additionalSteps.toLocaleString('fr-FR')}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <dt className="text-slate-600 dark:text-slate-300">Marche supplémentaire</dt>
                  <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">{roundKcal(snapshot.target.energy.walkingKcal)} kcal</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600 dark:text-slate-300">Activités enregistrées</dt>
                  <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">{snapshot.activities.length}</dd>
                </div>
              </dl>
            </Card>
          </div>

          {snapshot.activities.length > 0 ? (
            <Card className="mt-4 p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Activités du jour</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Les calories affichées sont celles retenues dans la dépense quotidienne.</p>
                </div>
                <Link to={`${routePaths.activities}?date=${encodeURIComponent(date)}`} className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  Ouvrir le journal
                </Link>
              </div>
              <div className="mt-5 divide-y divide-slate-200 dark:divide-slate-800">
                {snapshot.activities.map((activity) => {
                  const presentation = presentActivity(activity);
                  return (
                    <div key={activity.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Link to={editActivityPath(activity.id)} className="font-semibold text-slate-950 hover:text-brand-700 dark:text-white dark:hover:text-brand-300">
                          {presentation.title}
                        </Link>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {presentation.subtitle} · {activity.durationMinutes} min
                        </p>
                      </div>
                      <p className="font-bold tabular-nums text-slate-950 dark:text-white">{Math.round(presentation.caloriesKcal)} kcal</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {nutrition ? (
            <Card className="mt-4 p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    <Utensils aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-950 dark:text-white">Nutrition consommée</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {nutrition.consumed.entryCount} entrée{nutrition.consumed.entryCount > 1 ? 's' : ''} renseignée{nutrition.consumed.entryCount > 1 ? 's' : ''} · journée {nutrition.journalStatus?.isComplete ? 'terminée' : 'en cours'}
                    </p>
                  </div>
                </div>
                <Link to={`${routePaths.food}?date=${encodeURIComponent(date)}`} className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">Ouvrir le journal alimentaire</Link>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div><p className="text-sm text-slate-500">Calories</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">{roundKcal(nutrition.consumed.caloriesKcal)} / {snapshot.target.targetCaloriesKcal} kcal</p><ProgressBar className="mt-3" label="Calories consommées" value={nutrition.consumed.caloriesKcal} max={snapshot.target.targetCaloriesKcal} indicatorClassName="bg-orange-500" /></div>
                <div><p className="text-sm text-slate-500">Protéines</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">{roundKcal(nutrition.consumed.proteinGrams)} / {snapshot.target.macros.proteinGrams} g</p><ProgressBar className="mt-3" label="Protéines consommées" value={nutrition.consumed.proteinGrams} max={snapshot.target.macros.proteinGrams} indicatorClassName="bg-emerald-600" /></div>
                <div><p className="text-sm text-slate-500">Glucides</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">{roundKcal(nutrition.consumed.carbohydratesGrams)} / {snapshot.target.macros.carbohydratesGrams} g</p><ProgressBar className="mt-3" label="Glucides consommés" value={nutrition.consumed.carbohydratesGrams} max={snapshot.target.macros.carbohydratesGrams} indicatorClassName="bg-amber-500" /></div>
                <div><p className="text-sm text-slate-500">Lipides</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">{roundKcal(nutrition.consumed.fatGrams)} / {snapshot.target.macros.fatGrams} g</p><ProgressBar className="mt-3" label="Lipides consommés" value={nutrition.consumed.fatGrams} max={snapshot.target.macros.fatGrams} indicatorClassName="bg-violet-600" /></div>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                {nutrition.remaining.caloriesKcal >= 0
                  ? `${roundKcal(nutrition.remaining.caloriesKcal)} kcal restantes aujourd’hui.`
                  : `${Math.abs(roundKcal(nutrition.remaining.caloriesKcal))} kcal au-dessus de la cible.`}
              </p>
            </Card>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              to={routePaths.addFood}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Utensils aria-hidden="true" className="size-5" />
              Ajouter un aliment
            </Link>
            <Link
              to={routePaths.addActivity}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Dumbbell aria-hidden="true" className="size-5" />
              Ajouter une activité
            </Link>
            <a
              href="#dashboard-weight-form-weightKg"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Scale aria-hidden="true" className="size-5" />
              Renseigner le poids
            </a>
            <a
              href="#dashboard-steps-form-totalSteps"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Footprints aria-hidden="true" className="size-5" />
              Renseigner les pas
            </a>
          </div>

          <DailyInputsPanel
            snapshot={snapshot}
            onSaveWeight={saveWeight}
            onSaveSteps={saveSteps}
          />

          <InlineNotice className="mt-6" title="Estimations, pas mesures exactes">
            Le métabolisme, les calories de marche et les objectifs nutritionnels sont des estimations de pilotage. Ils ne remplacent pas un avis médical ou diététique individualisé.
          </InlineNotice>
        </>
      ) : status !== 'loading' && status !== 'error' ? (
        <InlineNotice className="mt-8" tone="error" title="Données quotidiennes absentes">
          <div className="flex items-center gap-2">
            <CircleAlert aria-hidden="true" className="size-4" />
            Recharge la page pour relancer le calcul.
          </div>
        </InlineNotice>
      ) : null}
    </section>
  );
}
