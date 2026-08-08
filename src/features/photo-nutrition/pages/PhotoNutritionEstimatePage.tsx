import { ArrowLeft, ImagePlus, Pencil, X } from 'lucide-react';
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
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ContextHelp } from '@/shared/ui/ContextHelp';
import { IconAction } from '@/shared/ui/IconAction';
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
        className="hidden items-center gap-2 text-sm font-semibold text-[var(--sp-accent-primary)] hover:underline lg:inline-flex"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {navigationState?.foodJournalReturn?.addMethodsPath
          ? 'Retour aux méthodes d’ajout'
          : 'Retour au journal'}
      </Link>

      <div>
        <p className="text-sm font-semibold uppercase text-[var(--sp-accent-primary)]">Journal alimentaire</p>
        <h1 id="photo-estimate-title" className="mt-1 text-3xl font-bold text-[var(--sp-text-primary)]">
          Estimation photo
        </h1>
        <p className="mt-2 text-sm text-[var(--sp-text-secondary)]">
          Choisis une photo du repas.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-4 p-4 sm:p-5">
          <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-[var(--sp-radius-control)] border border-[var(--sp-border-subtle)] bg-[var(--sp-surface-muted)] p-4 text-[var(--sp-text-primary)] transition-colors hover:border-[var(--sp-border-strong)] motion-reduce:transition-none">
            <span className="grid size-11 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-accent-primary)] text-white">
              <ImagePlus aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">Choisir une photo</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--sp-text-secondary)]">JPEG, PNG, WebP ou HEIC</span>
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
            <div className="flex gap-3 rounded-[var(--sp-radius-control)] border border-[var(--sp-border-subtle)] bg-[var(--sp-surface-muted)] p-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Aperçu de la photo sélectionnée"
                  className="h-20 w-20 shrink-0 rounded-[var(--sp-radius-control)] object-cover"
                />
              ) : (
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-elevated)] text-xs font-semibold text-[var(--sp-text-secondary)]">
                  Photo
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[var(--sp-success)]">Photo sélectionnée</p>
                  <IconAction
                    icon={X}
                    label="Supprimer la photo sélectionnée"
                    variant="ghost"
                    onClick={clearPhoto}
                    disabled={isAnalyzing || isSaving}
                  />
                </div>
                <p className="mt-1 truncate text-sm text-[var(--sp-text-secondary)]">{selectedFile.name}</p>
                <p className="mt-1 text-xs text-[var(--sp-text-muted)]">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
          ) : null}

          <div className="rounded-[var(--sp-radius-control)] border border-[var(--sp-border-subtle)] px-3 py-2">
            <div className="flex min-h-[var(--sp-touch-target)] w-full min-w-0 items-center justify-between gap-3">
              <span className="min-w-0 font-semibold text-[var(--sp-text-primary)]">Analyse IA</span>
              <span className="flex shrink-0 items-center gap-2 text-sm">
                <span className="whitespace-nowrap text-[var(--sp-text-secondary)]">
                  {useRemoteAi ? 'Activée' : 'Désactivée'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useRemoteAi}
                  aria-label="Activer l’analyse IA pour cette photo"
                  disabled={!aiConfig.enabled || isAnalyzing || isSaving}
                  onClick={() => setUseRemoteAi((current) => !current)}
                  className="flex h-[var(--sp-touch-target)] w-14 shrink-0 items-center justify-center rounded-[var(--sp-radius-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
                >
                  <span
                    aria-hidden="true"
                    data-testid="photo-ai-switch-track"
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
                      useRemoteAi ? 'bg-[var(--sp-accent-primary)]' : 'bg-[var(--sp-border-strong)]'
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
            <p className="pb-1 text-xs leading-5 text-[var(--sp-text-muted)]">
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
                className="sp-button sp-button--secondary inline-flex min-h-[var(--sp-control-height-md)] items-center justify-center rounded-[var(--sp-radius-control)] px-4 text-sm font-semibold"
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
              <div className="border-b border-[var(--sp-border-subtle)] px-4 py-3 sm:px-5">
                <h2 className="font-semibold text-[var(--sp-text-primary)]">
                  {isManual ? 'Saisir le repas' : 'Corriger l’estimation'}
                </h2>
                <p className="mt-1 text-sm text-[var(--sp-text-muted)]">
                  {isManual
                    ? 'Renseigne les valeurs du repas.'
                    : 'Ajuste les valeurs proposées avant validation.'}
                </p>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <label className="grid gap-1.5 text-sm font-semibold text-[var(--sp-text-secondary)] sm:col-span-2">
                  Nom du repas
                  <input
                    name="name"
                    defaultValue={estimate.name}
                    autoFocus={isManual}
                    className={`${inputClassName} text-base font-normal`}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-[var(--sp-text-secondary)]">
                  Quantité en g/ml
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="any"
                    defaultValue={isManual ? '' : estimate.amount}
                    className={`${inputClassName} text-base font-normal`}
                  />
                </label>
                {fields.map(([key, label]) => (
                  <label key={key} className="grid gap-1.5 text-sm font-semibold text-[var(--sp-text-secondary)]">
                    {label}
                    <input
                      name={key}
                      type="number"
                      min="0"
                      step="any"
                      defaultValue={isManual ? '' : estimate.nutrition[key]}
                      className={`${inputClassName} text-base font-normal`}
                    />
                  </label>
                ))}
              </div>
              <div className="border-t border-[var(--sp-border-subtle)] p-4 sm:px-5">
                {formError ? (
                  <p role="alert" className="mb-3 text-sm font-medium text-[var(--sp-error)]">{formError}</p>
                ) : null}
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
