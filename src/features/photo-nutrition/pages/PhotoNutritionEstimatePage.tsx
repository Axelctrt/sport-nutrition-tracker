import { ArrowLeft, Bot, ImagePlus } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { foodJournalPath } from '@/app/routePaths';
import {
  createRemotePhotoNutritionAnalysisPort,
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
  type FoodJournalNavigationState,
} from '@/features/food-journal/navigation/foodJournalNavigation';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ContextHelp } from '@/shared/ui/ContextHelp';
import { InlineNotice } from '@/shared/ui/InlineNotice';

const fields = [
  ['caloriesKcal', 'Calories approximatives'],
  ['proteinGrams', 'Protéines'],
  ['carbohydratesGrams', 'Glucides'],
  ['fatGrams', 'Lipides'],
] as const;

export interface PhotoNutritionEstimatePageProps {
  analyzePhoto?: typeof analyzePhotoNutrition;
  saveEstimate?: typeof savePhotoNutritionEstimateToJournal;
  aiConfig?: PhotoNutritionAiConfig;
  createRemoteAiPort?: (config: { endpointUrl: string; timeoutMs?: number }) => PhotoNutritionAnalysisPort;
}

const num = (data: FormData, key: string): number => Number(String(data.get(key) ?? 0).replace(',', '.'));
const slotOf = (value: string | null): MealSlot =>
  value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snacks' ? value : 'snacks';
const formatFileSize = (size: number): string =>
  size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} Ko` : `${(size / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
const fromForm = (data: FormData, analysis: PhotoNutritionAnalysisResult): PhotoNutritionEstimate => ({
  ...analysis.estimate,
  name: String(data.get('name') || analysis.estimate.name).trim(),
  amount: num(data, 'amount'),
  nutrition: {
    caloriesKcal: num(data, 'caloriesKcal'),
    proteinGrams: num(data, 'proteinGrams'),
    carbohydratesGrams: num(data, 'carbohydratesGrams'),
    fatGrams: num(data, 'fatGrams'),
  },
});

const messageOf = (caught: unknown): string =>
  caught instanceof Error ? caught.message : 'Analyse IA indisponible : fallback local conseillé.';

function withRemoteFallbackWarning(
  result: PhotoNutritionAnalysisResult,
  reason: string,
): PhotoNutritionAnalysisResult {
  return {
    ...result,
    warnings: [
      ...result.warnings,
      `IA distante indisponible : ${reason}`,
      'Fallback local appliqué automatiquement : corrige les valeurs avant validation.',
    ],
  };
}

function analysisFormKey(analysis: PhotoNutritionAnalysisResult): string {
  const nutrition = analysis.estimate.nutrition;
  return [
    analysis.mode,
    analysis.confidence,
    analysis.estimate.name,
    analysis.estimate.amount,
    nutrition.caloriesKcal,
    nutrition.proteinGrams,
    nutrition.carbohydratesGrams,
    nutrition.fatGrams,
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
  const [error, setError] = useState('');
  const [remoteFallbackMessage, setRemoteFallbackMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState('');
  const [useRemoteAi, setUseRemoteAi] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile || typeof URL.createObjectURL !== 'function') {
      setPreviewUrl('');
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedFile]);

  function selectPhoto(file: File | undefined) {
    if (!file) return;
    setSelectedFile(file);
    setAnalysis(undefined);
    setError('');
    setRemoteFallbackMessage('');
  }

  function clearPhoto() {
    setSelectedFile(undefined);
    setAnalysis(undefined);
    setError('');
    setRemoteFallbackMessage('');
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  }

  async function run() {
    if (!selectedFile) {
      setError('Choisis une photo du repas.');
      return;
    }
    if (useRemoteAi && !aiConfig.enabled) {
      setError('Analyse IA indisponible : configure d’abord le proxy backend.');
      return;
    }
    setIsAnalyzing(true);
    setError('');
    setRemoteFallbackMessage('');
    try {
      if (useRemoteAi && aiConfig.enabled) {
        try {
          const remotePort = createRemoteAiPort({ endpointUrl: aiConfig.endpointUrl, timeoutMs: aiConfig.timeoutMs });
          setAnalysis(await analyzePhoto(selectedFile, remotePort));
          return;
        } catch (remoteError) {
          const reason = messageOf(remoteError);
          const fallback = await analyzePhoto(selectedFile);
          setRemoteFallbackMessage(`${reason} Fallback local appliqué automatiquement.`);
          setAnalysis(withRemoteFallbackWarning(fallback, reason));
          return;
        }
      }

      setAnalysis(await analyzePhoto(selectedFile));
    } catch (caught) {
      setAnalysis(undefined);
      setError(caught instanceof Error ? caught.message : 'Repas non reconnu : corrige manuellement.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!analysis || isSaving) return;
    const estimate = fromForm(new FormData(event.currentTarget), analysis);
    if (!(estimate.amount > 0)) {
      setError('Corrige les champs obligatoires.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const result = await saveEstimate({ date, mealSlot, estimate });
      const returnContext = navigationState?.foodJournalReturn;
      await navigate(returnContext?.path ?? foodJournalPath(date), {
        state: createFoodJournalFeedbackState(returnContext, {
          title: `Estimation photo ajoutée au ${mealSlotLabels[mealSlot].toLocaleLowerCase('fr')}`,
          mealSlot,
          entryId: result.entry.id,
        }),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ajout impossible.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section aria-labelledby="photo-estimate-title" className="space-y-5 pb-8">
      <Link
        to={navigationState?.foodJournalReturn?.path ?? foodJournalPath(date)}
        state={createFoodJournalRestoreState(navigationState?.foodJournalReturn)}
        className="hidden items-center gap-2 text-sm font-semibold text-brand-700 hover:underline lg:inline-flex dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour au journal
      </Link>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Journal alimentaire</p>
        <h1 id="photo-estimate-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Estimation photo
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Ajoute une photo du repas, vérifie l’estimation, puis corrige les valeurs avant l’ajout au journal.
        </p>
      </div>

      <InlineNotice tone="info" title="Estimation à vérifier">
        En 0.25.1 F2, l’analyse IA distante passe uniquement par un proxy backend configuré. Sans consentement explicite, aucune image n’est envoyée. Si le proxy échoue, aucune image n’est conservée et le fallback local reste disponible.
      </InlineNotice>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <h2 className="font-semibold text-slate-950 dark:text-white">1. Photo du repas</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Le sélecteur iPhone proposera la caméra, la galerie ou les fichiers.</p>
        </div>
        <div className="grid gap-4 p-4 sm:p-5">
          <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-brand-950 shadow-sm transition hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-700 text-white dark:bg-brand-600">
              <ImagePlus aria-hidden="true" className="size-5" />
            </span>
            <span>
              <span className="block font-semibold">Choisir une photo</span>
              <span className="mt-1 block text-xs leading-5 opacity-80">La photo reste locale tant que tu n’autorises pas l’analyse IA.</span>
            </span>
            <input
              ref={photoInputRef}
              className="photo-native-input"
              type="file"
              accept="image/*"
              aria-label="Choisir une photo"
              onChange={(event) => selectPhoto(event.currentTarget.files?.[0])}
            />
          </label>

          {selectedFile ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex gap-3">
                {previewUrl ? (
                  <img src={previewUrl} alt="Aperçu de la photo sélectionnée" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-emerald-100 text-xs font-semibold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">Photo</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-emerald-950 dark:text-emerald-100">Photo sélectionnée</p>
                    <button
                      type="button"
                      aria-label="Supprimer la photo sélectionnée"
                      className="grid size-8 shrink-0 place-items-center rounded-full border border-emerald-300 bg-white text-lg leading-none text-emerald-900 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
                      onClick={clearPhoto}
                      disabled={isAnalyzing || isSaving}
                    >
                      ×
                    </button>
                  </div>
                  <p className="mt-1 truncate text-sm text-emerald-800 dark:text-emerald-200">{selectedFile.name}</p>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">Photo prête · {formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Aucune photo sélectionnée pour le moment.
            </p>
          )}

          <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-900 dark:bg-brand-950/30 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-700 text-white dark:bg-brand-500">
                <Bot aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950 dark:text-white">Autoriser l’analyse IA pour cette photo</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {aiConfig.enabled
                        ? 'Après activation, la photo sera transmise une fois par le proxy SportPilot à Google Gemini pour estimer le repas. Une connexion SportPilot est requise et les valeurs devront être vérifiées.'
                        : 'Le proxy distant est indisponible. L’analyse restera locale et aucune photo ne sera envoyée.'}
                    </p>
                  </div>
                  {aiConfig.enabled ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={useRemoteAi}
                      aria-label="Autoriser l’analyse IA distante pour cette photo"
                      disabled={isAnalyzing || isSaving}
                      onClick={() => setUseRemoteAi((current) => !current)}
                      className="inline-flex min-h-11 shrink-0 items-center gap-3 rounded-xl border border-brand-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60 dark:border-brand-800 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <span
                        aria-hidden="true"
                        className={`relative h-6 w-11 rounded-full transition-colors ${useRemoteAi ? 'bg-brand-700 dark:bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${useRemoteAi ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </span>
                      {useRemoteAi ? 'Activée' : 'Désactivée'}
                    </button>
                  ) : (
                    <span className="inline-flex min-h-11 items-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Analyse locale
                    </span>
                  )}
                </div>
                <ContextHelp className="mt-3" question="Pourquoi demander cette autorisation ?" tone="brand">
                  La photo peut contenir des informations personnelles. SportPilot ne l’envoie jamais automatiquement : ton accord vaut uniquement pour la photo sélectionnée, doit être redonné pour une nouvelle analyse et autorise son traitement par Google Gemini.
                </ContextHelp>
              </div>
            </div>
          </div>

          <Button onClick={() => void run()} className="w-full sm:w-auto" disabled={!selectedFile || isAnalyzing || isSaving}>
            {isAnalyzing ? 'Analyse en cours…' : useRemoteAi && aiConfig.enabled ? 'Analyser avec l’IA' : 'Analyser en local'}
          </Button>
        </div>
      </Card>

      {remoteFallbackMessage ? (
        <InlineNotice tone="info" title="IA indisponible, fallback local utilisé">
          {remoteFallbackMessage}
        </InlineNotice>
      ) : null}

      {error ? <InlineNotice role="alert" tone="error" title="Action impossible">{error}</InlineNotice> : null}

      {analysis ? (
        <>
          <InlineNotice tone="info" title={analysis.mode === 'remote-ai' ? 'Analyse IA à vérifier' : 'Analyse locale prudente'}>
            <p>Mode : {analysis.mode === 'local-fallback' ? 'fallback local sans IA distante' : 'analyse distante via proxy avec consentement'} · confiance {analysis.confidence}.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </InlineNotice>

          <form key={analysisFormKey(analysis)} onSubmit={(event) => void save(event)}>
            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
                <h2 className="font-semibold text-slate-950 dark:text-white">2. Corriger l’estimation</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ces valeurs sont approximatives. Ajuste-les avant validation.</p>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
                  Aliment détecté
                  <input name="name" defaultValue={analysis.estimate.name} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Quantité approximative en g/ml
                  <input name="amount" type="number" defaultValue={analysis.estimate.amount} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
                {fields.map(([key, label]) => (
                  <label key={key} className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {label}
                    <input name={key} type="number" defaultValue={analysis.estimate.nutrition[key] ?? ''} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                  </label>
                ))}
              </div>
              <div className="border-t border-slate-200 p-4 dark:border-slate-800 sm:px-5">
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
