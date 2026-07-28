import { ArrowLeft, ImagePlus, Pencil } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { foodJournalPath, routePaths } from '@/app/routePaths';
import { CloudAccountAccessError } from '@/application/account/cloudAccountAccess';
import {
  createRemotePhotoNutritionAnalysisPort,
  PhotoNutritionAiError,
  readPhotoNutritionAiConfig,
  type PhotoNutritionAiConfig,
} from '@/application/photo-nutrition/photoNutritionAiClient';
import {
  analyzePhotoNutrition,
  savePhotoNutritionEstimateToJournal,
  type PhotoNutritionAnalysisPort,
  type PhotoNutritionAnalysisResult,
  type PhotoNutritionEstimate,
} from '@/application/photo-nutrition/photoNutritionEstimationService';
import type { MealSlot } from '@/domain/models/food';
import {
  createFoodJournalFeedbackState,
  createFoodJournalRestoreState,
  foodJournalCancelPath,
  type FoodJournalNavigationState,
} from '@/features/food-journal/navigation/foodJournalNavigation';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ContextHelp } from '@/shared/ui/ContextHelp';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { SportPilotMultiStepLoader } from '@/shared/ui/SportPilotMultiStepLoader';
import { SportPilotStatefulButton } from '@/shared/ui/SportPilotStatefulButton';

const fields = [
  ['caloriesKcal', 'Calories approximatives'],
  ['proteinGrams', 'Protéines'],
  ['carbohydratesGrams', 'Glucides'],
  ['fatGrams', 'Lipides'],
] as const;

const EMPTY_ESTIMATE: PhotoNutritionEstimate = {
  name: '',
  amount: 0,
  nutrition: {
    caloriesKcal: 0,
    proteinGrams: 0,
    carbohydratesGrams: 0,
    fatGrams: 0,
  },
};

const analysisSteps = [
  { id: 'photo-ready', label: 'Photo prête' },
  { id: 'analysis', label: 'Analyse en cours' },
  { id: 'verification', label: 'Vérification du résultat' },
] as const;

interface AnalysisFailure {
  message: string;
  diagnosticRef?: string;
  accountAction?: 'reactivate' | 'reauthenticate';
}

export interface PhotoNutritionEstimatePageProps {
  analyzePhoto?: typeof analyzePhotoNutrition;
  saveEstimate?: typeof savePhotoNutritionEstimateToJournal;
  aiConfig?: PhotoNutritionAiConfig;
  createRemoteAiPort?: (config: { endpointUrl: string; timeoutMs?: number }) => PhotoNutritionAnalysisPort;
}

const num = (data: FormData, key: string): number =>
  Number(String(data.get(key) ?? 0).replace(',', '.'));
const slotOf = (value: string | null): MealSlot =>
  value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snacks'
    ? value
    : 'snacks';
const formatFileSize = (size: number): string =>
  size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} Ko`
    : `${(size / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;

function estimateFromForm(data: FormData): PhotoNutritionEstimate {
  return {
    name: String(data.get('name') ?? '').trim(),
    amount: num(data, 'amount'),
    nutrition: {
      caloriesKcal: num(data, 'caloriesKcal'),
      proteinGrams: num(data, 'proteinGrams'),
      carbohydratesGrams: num(data, 'carbohydratesGrams'),
      fatGrams: num(data, 'fatGrams'),
    },
  };
}

function failureOf(caught: unknown): AnalysisFailure {
  if (caught instanceof CloudAccountAccessError) {
    if (
      caught.code === 'LICENSE_EXPIRED'
      || caught.code === 'LICENSE_DEACTIVATED'
    ) {
      return {
        message:
          'La synchronisation de ton compte doit être réactivée avant d’utiliser l’analyse photo.',
        accountAction: 'reactivate',
      };
    }
    if (
      caught.code === 'SESSION_EXPIRED'
      || caught.code === 'ACCOUNT_SIGNED_OUT'
    ) {
      return {
        message:
          'Renouvelle ta connexion SportPilot pour utiliser l’analyse photo.',
        accountAction: 'reauthenticate',
      };
    }
  }
  if (caught instanceof PhotoNutritionAiError) {
    return {
      message: caught.message,
      ...(caught.diagnosticRef ? { diagnosticRef: caught.diagnosticRef } : {}),
    };
  }
  return {
    message: caught instanceof Error
      ? caught.message
      : 'L’analyse est indisponible pour le moment.',
  };
}

function formKey(estimate: PhotoNutritionEstimate, isManual: boolean): string {
  return [
    isManual ? 'manual' : 'ai',
    estimate.name,
    estimate.amount,
    estimate.nutrition.caloriesKcal,
    estimate.nutrition.proteinGrams,
    estimate.nutrition.carbohydratesGrams,
    estimate.nutrition.fatGrams,
  ].join('|');
}

export function PhotoNutritionEstimatePage({
  analyzePhoto = analyzePhotoNutrition,
  saveEstimate = savePhotoNutritionEstimateToJournal,
  aiConfig = readPhotoNutritionAiConfig(),
  createRemoteAiPort = createRemotePhotoNutritionAnalysisPort,
}: PhotoNutritionEstimatePageProps) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as FoodJournalNavigationState | null;
  const date = params.get('date') || new Date().toISOString().slice(0, 10);
  const mealSlot = slotOf(params.get('slot'));
  const [analysis, setAnalysis] = useState<PhotoNutritionAnalysisResult>();
  const [manualEstimate, setManualEstimate] = useState<PhotoNutritionEstimate>();
  const [failure, setFailure] = useState<AnalysisFailure>();
  const [formError, setFormError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState('');
  const [useRemoteAi, setUseRemoteAi] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const estimate = analysis?.estimate ?? manualEstimate;
  const isManual = Boolean(manualEstimate);
  const analysisButtonState = isAnalyzing
    ? 'loading'
    : failure
      ? 'error'
      : analysis
        ? 'success'
        : 'idle';

  useEffect(() => {
    if (!selectedFile || typeof URL.createObjectURL !== 'function') {
      setPreviewUrl('');
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedFile]);

  function resetResult() {
    setAnalysis(undefined);
    setManualEstimate(undefined);
    setFailure(undefined);
    setFormError('');
  }

  function selectPhoto(file: File | undefined) {
    if (!file) return;
    setSelectedFile(file);
    setUseRemoteAi(false);
    resetResult();
  }

  function clearPhoto() {
    setSelectedFile(undefined);
    setUseRemoteAi(false);
    resetResult();
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  function openManualEntry() {
    setAnalysis(undefined);
    setManualEstimate(EMPTY_ESTIMATE);
    setFailure(undefined);
    setFormError('');
  }

  async function runAnalysis() {
    if (!selectedFile) {
      setFailure({ message: 'Choisis une photo du repas.' });
      return;
    }
    if (!useRemoteAi) {
      openManualEntry();
      return;
    }

    setIsAnalyzing(true);
    resetResult();
    try {
      const remotePort = createRemoteAiPort({
        endpointUrl: aiConfig.endpointUrl,
        timeoutMs: aiConfig.timeoutMs,
      });
      setAnalysis(await analyzePhoto(selectedFile, remotePort));
    } catch (caught) {
      setAnalysis(undefined);
      setFailure(failureOf(caught));
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!estimate || isSaving) return;
    const nextEstimate = estimateFromForm(new FormData(event.currentTarget));
    if (!nextEstimate.name || !(nextEstimate.amount > 0) || !(nextEstimate.nutrition.caloriesKcal >= 0)) {
      setFormError('Renseigne au moins le nom, la quantité et les calories.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      const result = await saveEstimate({ date, mealSlot, estimate: nextEstimate });
      const returnContext = navigationState?.foodJournalReturn;
      await navigate(returnContext?.path ?? foodJournalPath(date), {
        state: createFoodJournalFeedbackState(returnContext, {
          title: `${isManual ? 'Repas' : 'Estimation photo'} ajouté au ${mealSlotLabels[mealSlot].toLocaleLowerCase('fr')}`,
          mealSlot,
          entryId: result.entry.id,
        }),
      });
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Ajout impossible.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section aria-labelledby="photo-estimate-title" className="space-y-5 pb-8">
      <Link
        to={foodJournalCancelPath(
          navigationState?.foodJournalReturn,
          foodJournalPath(date),
        )}
        state={createFoodJournalRestoreState(navigationState?.foodJournalReturn)}
        className="hidden items-center gap-2 text-sm font-semibold text-brand-700 hover:underline lg:inline-flex dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {navigationState?.foodJournalReturn?.addMethodsPath
          ? 'Retour aux méthodes d’ajout'
          : 'Retour au journal'}
      </Link>

      <div>
        <p className="text-sm font-semibold uppercase text-brand-700 dark:text-brand-300">Journal alimentaire</p>
        <h1 id="photo-estimate-title" className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
          Estimation photo
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Choisis une photo du repas.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-4 p-4 sm:p-5">
          <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-brand-950 transition hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-700 text-white dark:bg-brand-600">
              <ImagePlus aria-hidden="true" className="size-5" />
            </span>
            <span>
              <span className="block font-semibold">Choisir une photo</span>
              <span className="mt-1 block text-xs leading-5 opacity-80">JPEG, PNG, WebP ou HEIC</span>
            </span>
            <input
              ref={photoInputRef}
              className="photo-native-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              aria-label="Choisir une photo"
              onChange={(event) => selectPhoto(event.currentTarget.files?.[0])}
            />
          </label>

          {selectedFile ? (
            <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Aperçu de la photo sélectionnée"
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-emerald-100 text-xs font-semibold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                  Photo
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-emerald-950 dark:text-emerald-100">Photo sélectionnée</p>
                  <button
                    type="button"
                    aria-label="Supprimer la photo sélectionnée"
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-emerald-300 bg-white text-lg text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
                    onClick={clearPhoto}
                    disabled={isAnalyzing || isSaving}
                  >
                    ×
                  </button>
                </div>
                <p className="mt-1 truncate text-sm text-emerald-800 dark:text-emerald-200">{selectedFile.name}</p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
            <div className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3">
              <span className="min-w-0 font-semibold text-slate-950 dark:text-white">Analyse IA</span>
              <span className="flex shrink-0 items-center gap-2 text-sm">
                <span className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                {useRemoteAi ? 'Activée' : 'Désactivée'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useRemoteAi}
                  aria-label="Activer l’analyse IA pour cette photo"
                  disabled={!aiConfig.enabled || isAnalyzing || isSaving}
                  onClick={() => setUseRemoteAi((current) => !current)}
                  className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
                >
                  <span
                    aria-hidden="true"
                    data-testid="photo-ai-switch-track"
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
                      useRemoteAi ? 'bg-brand-700 dark:bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      data-testid="photo-ai-switch-thumb"
                      className={`absolute left-[3px] top-[3px] size-[22px] rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
                        useRemoteAi ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </span>
                </button>
              </span>
            </div>
            <p className="pb-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {aiConfig.enabled
                ? 'Une connexion SportPilot valide sera vérifiée avant tout envoi pour cette analyse.'
                : 'L’analyse en ligne est temporairement indisponible.'}
            </p>
          </div>

          <ContextHelp question="Que devient ma photo ?" tone="brand">
            Elle est envoyée uniquement après activation de l’analyse IA, pour cette tentative. Elle n’est pas
            enregistrée dans ton journal alimentaire.
          </ContextHelp>

          <SportPilotStatefulButton
            onClick={() => void runAnalysis()}
            state={analysisButtonState}
            idleLabel={useRemoteAi ? 'Analyser avec l’IA' : 'Saisir manuellement'}
            loadingLabel="Analyse en cours…"
            successLabel="Analyse terminée"
            errorLabel="Réessayer"
            fullWidth
            className="sm:w-auto"
            disabled={!selectedFile || isAnalyzing || isSaving}
          />
          {isAnalyzing ? (
            <SportPilotMultiStepLoader
              steps={analysisSteps}
              activeStep={1}
              label="Étapes de l’analyse photo"
            />
          ) : null}
        </div>
      </Card>

      {failure ? (
        <InlineNotice
          role="alert"
          tone="error"
          title={
            failure.accountAction === 'reauthenticate'
              ? 'Reconnexion requise'
              : failure.accountAction === 'reactivate'
                ? 'Analyse IA indisponible'
                : 'Analyse indisponible'
          }
        >
          <p>{failure.message}</p>
          {failure.diagnosticRef ? (
            <p className="mt-1 text-xs">Référence : {failure.diagnosticRef}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {failure.accountAction ? (
              <Link
                to={routePaths.syncPrototype}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {failure.accountAction === 'reauthenticate'
                  ? 'Se reconnecter'
                  : 'Gérer le compte'}
              </Link>
            ) : null}
            <Button type="button" variant="secondary" onClick={openManualEntry}>
              <Pencil aria-hidden="true" className="size-4" />
              Saisir manuellement
            </Button>
          </div>
        </InlineNotice>
      ) : null}

      {estimate ? (
        <>
          {analysis ? (
            <InlineNotice tone="info" title="Estimation à vérifier">
              L’analyse peut se tromper sur les aliments et les quantités.
            </InlineNotice>
          ) : null}
          <form key={formKey(estimate, isManual)} onSubmit={(event) => void save(event)}>
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
              <h2 className="font-semibold text-slate-950 dark:text-white">
                {isManual ? 'Saisir le repas' : 'Corriger l’estimation'}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isManual
                  ? 'Renseigne les valeurs du repas.'
                  : 'Ajuste les valeurs proposées avant validation.'}
              </p>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
                Nom du repas
                <input
                  name="name"
                  defaultValue={estimate.name}
                  autoFocus={isManual}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Quantité en g/ml
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={isManual ? '' : estimate.amount}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
              {fields.map(([key, label]) => (
                <label key={key} className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {label}
                  <input
                    name={key}
                    type="number"
                    min="0"
                    step="any"
                    defaultValue={isManual ? '' : estimate.nutrition[key]}
                    className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
              ))}
            </div>
            <div className="border-t border-slate-200 p-4 dark:border-slate-800 sm:px-5">
              {formError ? <p role="alert" className="mb-3 text-sm font-medium text-rose-700 dark:text-rose-300">{formError}</p> : null}
              <Button type="submit" size="lg" className="w-full" disabled={isSaving}>
                {isSaving ? 'Ajout en cours…' : 'Ajouter au journal'}
              </Button>
            </div>
          </Card>
          </form>
        </>
      ) : null}
    </section>
  );
}
