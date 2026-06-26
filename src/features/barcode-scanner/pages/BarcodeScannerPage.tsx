import {
  ArrowLeft,
  Camera,
  CameraOff,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  Search,
  SquarePen,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  foodJournalPath,
  newFoodProductForMealPath,
  routePaths,
  selectFoodPath,
} from '@/app/routePaths';
import {
  lookupFoodProductByBarcode,
  type BarcodeProductLookupResult,
} from '@/application/open-food-facts/barcodeProductLookupService';
import { saveProductEntry } from '@/application/food/foodJournalService';
import type { FoodProduct, MealSlot } from '@/domain/models/food';
import { useBarcodeScanner } from '@/features/barcode-scanner/hooks/useBarcodeScanner';
import { validateFoodBarcode } from '@/features/barcode-scanner/utils/scannerBarcode';
import { FoodEntryQuickDialog } from '@/features/food-journal/components/FoodEntryQuickDialog';
import type { FoodEntryFormValues } from '@/features/food-journal/schemas/foodEntrySchema';
import {
  createFoodJournalFeedbackState,
  type FoodJournalNavigationState,
} from '@/features/food-journal/navigation/foodJournalNavigation';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { OpenFoodFactsError } from '@/infrastructure/open-food-facts/OpenFoodFactsError';
import type { BarcodeScannerPort } from '@/infrastructure/barcode-scanner/BarcodeScanner';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

const mealSlots: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

type LookupProduct = (
  barcode: string,
  signal?: AbortSignal,
) => Promise<BarcodeProductLookupResult>;

type SaveEntry = (values: FoodEntryFormValues) => Promise<unknown>;

function isMealSlot(value: string | null): value is MealSlot {
  return value !== null && mealSlots.includes(value as MealSlot);
}

function lookupErrorMessage(error: unknown): string {
  if (error instanceof OpenFoodFactsError) return error.message;
  return error instanceof Error
    ? error.message
    : 'Impossible de rechercher ce produit.';
}

interface BarcodeScannerPageProps {
  scanner?: BarcodeScannerPort;
  lookupProduct?: LookupProduct;
  saveEntry?: SaveEntry;
}

export function BarcodeScannerPage({
  scanner,
  lookupProduct = lookupFoodProductByBarcode,
  saveEntry = saveProductEntry,
}: BarcodeScannerPageProps = {}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as FoodJournalNavigationState | null;
  const targetRef = useRef<HTMLDivElement>(null);
  const lookupAbortRef = useRef<AbortController | undefined>(undefined);
  const lastAutomaticCodeRef = useRef<string | undefined>(undefined);
  const requestedDate = searchParams.get('date');
  const requestedSlot = searchParams.get('slot');
  const date = requestedDate && isValidLocalDate(requestedDate) ? requestedDate : toLocalDate();
  const mealSlot = isMealSlot(requestedSlot) ? requestedSlot : 'snacks';
  const {
    status,
    result,
    errorMessage,
    informationMessage,
    start,
    stop,
    reset,
  } = useBarcodeScanner(scanner ? { scanner } : undefined);
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState<string>();
  const [manualResult, setManualResult] = useState<ReturnType<typeof validateFoodBarcode>>();
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle');
  const [lookupResult, setLookupResult] = useState<BarcodeProductLookupResult>();
  const [lookupMessage, setLookupMessage] = useState<string>();
  const [lookupError, setLookupError] = useState<string>();
  const [resolvedProduct, setResolvedProduct] = useState<FoodProduct>();
  const [submitError, setSubmitError] = useState<string>();
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);

  const activeResult = useMemo(() => {
    if (manualResult) return manualResult;
    if (!result) return undefined;
    return {
      code: result.code,
      format: result.format,
    };
  }, [manualResult, result]);

  const scanning = status === 'requesting' || status === 'scanning';
  const secureCameraAvailable = typeof window === 'undefined'
    ? false
    : window.isSecureContext || ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  const clearLookup = useCallback(() => {
    lookupAbortRef.current?.abort();
    setLookupStatus('idle');
    setLookupResult(undefined);
    setLookupMessage(undefined);
    setLookupError(undefined);
    setResolvedProduct(undefined);
    setSubmitError(undefined);
    setEntryDialogOpen(false);
  }, []);

  const resolveCode = useCallback(async (barcode: string) => {
    lookupAbortRef.current?.abort();
    const controller = new AbortController();
    lookupAbortRef.current = controller;
    setLookupStatus('loading');
    setLookupResult(undefined);
    setLookupMessage(undefined);
    setLookupError(undefined);
    setResolvedProduct(undefined);
    setSubmitError(undefined);

    try {
      const lookup = await lookupProduct(barcode, controller.signal);
      if (controller.signal.aborted) return;
      setLookupResult(lookup);

      if (lookup.status === 'local') {
        setResolvedProduct(lookup.product);
        setEntryDialogOpen(true);
        setLookupMessage('Produit trouvé dans les aliments locaux. Il reste disponible hors connexion.');
        setLookupStatus('ready');
        return;
      }

      if (lookup.status === 'remote') {
        setResolvedProduct(lookup.product);
        setEntryDialogOpen(true);
        setLookupMessage(
          lookup.saveStatus === 'created'
            ? 'Produit trouvé dans Open Food Facts et enregistré localement.'
            : lookup.saveStatus === 'updated'
              ? 'Produit local actualisé avec les données Open Food Facts.'
              : 'La version manuelle déjà enregistrée a été conservée.',
        );
        setLookupStatus('ready');
        return;
      }

      if (lookup.status === 'archived') {
        setLookupMessage('Ce code correspond à un aliment archivé. Il n’est pas réactivé automatiquement.');
        setLookupStatus('missing');
        return;
      }

      if (lookup.status === 'offline-missing') {
        setLookupMessage(
          'Ce produit n’est pas encore enregistré localement. Une connexion Internet est nécessaire pour le rechercher dans Open Food Facts.',
        );
        setLookupStatus('missing');
        return;
      }

      setLookupMessage('Aucun produit correspondant n’a été trouvé dans Open Food Facts.');
      setLookupStatus('missing');
    } catch (error) {
      if (controller.signal.aborted) return;
      setLookupError(lookupErrorMessage(error));
      setLookupStatus('error');
    }
  }, [lookupProduct]);

  useEffect(() => {
    if (!result || lastAutomaticCodeRef.current === result.code) return;
    lastAutomaticCodeRef.current = result.code;
    void resolveCode(result.code);
  }, [resolveCode, result]);

  useEffect(() => () => lookupAbortRef.current?.abort(), []);

  const validateManualEntry = async () => {
    const valid = validateFoodBarcode(manualValue);
    if (!valid) {
      setManualResult(undefined);
      setManualError('Saisis un code EAN-13, EAN-8, UPC-A ou UPC-E uniquement composé de chiffres.');
      clearLookup();
      return;
    }
    setManualError(undefined);
    setManualResult(valid);
    lastAutomaticCodeRef.current = valid.code;
    await stop();
    await resolveCode(valid.code);
  };

  const handleStart = async () => {
    setManualResult(undefined);
    setManualError(undefined);
    lastAutomaticCodeRef.current = undefined;
    clearLookup();
    await start(targetRef.current);
  };

  const handleReset = () => {
    setManualResult(undefined);
    setManualValue('');
    setManualError(undefined);
    lastAutomaticCodeRef.current = undefined;
    clearLookup();
    reset();
  };

  const handleSubmit = async (values: FoodEntryFormValues) => {
    setSubmitError(undefined);
    try {
      const savedEntry = await saveEntry(values);
      const entryId = savedEntry && typeof savedEntry === 'object' && 'id' in savedEntry
        && typeof savedEntry.id === 'string'
        ? savedEntry.id
        : undefined;
      const returnContext = navigationState?.foodJournalReturn;
      await navigate(returnContext?.path ?? foodJournalPath(values.date), {
        state: createFoodJournalFeedbackState(returnContext, {
          title: `Aliment ajouté au ${mealSlotLabels[values.mealSlot].toLocaleLowerCase('fr')}`,
          mealSlot: values.mealSlot,
          ...(entryId ? { entryId } : {}),
        }),
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Impossible d’ajouter cet aliment au repas.',
      );
    }
  };

  const fallbackBarcode = lookupResult?.barcode ?? activeResult?.code;

  return (
    <section className="min-w-0 overflow-x-clip" aria-labelledby="barcode-scanner-title">
      <Link
        to={selectFoodPath(date, mealSlot)}
        state={location.state}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour au sélecteur
      </Link>

      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Caméra du téléphone
        </p>
        <h1 id="barcode-scanner-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Scanner un code-barres
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          Repas cible : <strong>{mealSlotLabels[mealSlot]}</strong>. Le produit sera d’abord recherché localement, puis dans Open Food Facts si nécessaire.
        </p>
      </div>

      <CollapsibleSection
        className="mt-6"
        title="Caméra et confidentialité"
        description="La caméra démarre uniquement après ton action et nécessite une adresse HTTPS."
        defaultOpen={!secureCameraAvailable}
      >
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          La caméra fonctionne uniquement en HTTPS ou sur localhost. Une adresse locale comme <code>http://192.168.x.x</code> ne permet pas l’accès à la caméra sur téléphone. Les images restent dans le navigateur et ne sont pas envoyées à SportPilot.
        </p>
      </CollapsibleSection>

      {!secureCameraAvailable ? (
        <InlineNotice className="mt-4" tone="error" title="Caméra indisponible sur cette adresse">
          Ouvre la version HTTPS de SportPilot. La saisie manuelle ci-dessous reste disponible.
        </InlineNotice>
      ) : null}

      <Card className="mt-6 min-w-0 overflow-hidden p-4 sm:p-6">
        <div
          ref={targetRef}
          data-testid="barcode-scanner-target"
          className="barcode-scanner-viewport relative aspect-[4/3] min-h-52 max-h-[56dvh] w-full overflow-hidden rounded-2xl bg-slate-950"
          aria-label="Aperçu de la caméra"
        >
          {!scanning ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
              <div>
                {status === 'detected' ? (
                  <ScanLine aria-hidden="true" className="mx-auto size-12 text-emerald-300" />
                ) : (
                  <Camera aria-hidden="true" className="mx-auto size-12 text-slate-300" />
                )}
                <p className="mt-3 font-semibold">
                  {status === 'detected' ? 'Code détecté' : 'La caméra est arrêtée'}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  La caméra ne démarre qu’après une action explicite.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {!scanning ? (
            <Button
              className="w-full sm:w-auto"
              disabled={!secureCameraAvailable}
              onClick={() => void handleStart()}
            >
              <Camera aria-hidden="true" className="size-4" />
              {status === 'detected' ? 'Scanner un autre code' : 'Démarrer la caméra'}
            </Button>
          ) : (
            <Button className="w-full sm:w-auto" variant="danger" onClick={() => void stop()}>
              <CameraOff aria-hidden="true" className="size-4" />
              Arrêter la caméra
            </Button>
          )}
          {(status === 'error' || status === 'detected' || lookupStatus !== 'idle') ? (
            <Button className="w-full sm:w-auto" variant="secondary" onClick={handleReset}>
              <RefreshCw aria-hidden="true" className="size-4" />
              Réinitialiser
            </Button>
          ) : null}
        </div>
      </Card>

      {status === 'requesting' ? (
        <InlineNotice className="mt-4" title="Autorisation de la caméra">
          Accepte la demande du navigateur pour utiliser la caméra arrière.
        </InlineNotice>
      ) : null}

      {status === 'scanning' ? (
        <InlineNotice className="mt-4" title="Lecture en cours">
          Présente un code EAN-13, EAN-8, UPC-A ou UPC-E. Deux lectures identiques sont nécessaires avant validation.
        </InlineNotice>
      ) : null}

      {informationMessage ? (
        <InlineNotice className="mt-4" title="Caméra arrêtée">
          {informationMessage}
        </InlineNotice>
      ) : null}

      {errorMessage ? (
        <InlineNotice className="mt-4" tone="error" title="Impossible d’utiliser la caméra">
          {errorMessage}
        </InlineNotice>
      ) : null}

      {activeResult ? (
        <InlineNotice className="mt-4" tone="success" title="Code-barres reconnu">
          <p className="break-all font-mono text-base font-semibold">{activeResult.code}</p>
          <p className="mt-1">Format : {activeResult.format}</p>
        </InlineNotice>
      ) : null}

      {lookupStatus === 'loading' ? (
        <Card className="mt-4 p-6 text-center" role="status">
          <LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" />
          <p className="mt-3 font-semibold text-slate-950 dark:text-white">Recherche du produit…</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Aliments locaux, puis Open Food Facts.</p>
        </Card>
      ) : null}

      {lookupError ? (
        <InlineNotice className="mt-4" tone="error" title="Service externe indisponible">
          <p>{lookupError}</p>
          {activeResult ? (
            <Button className="mt-3" variant="secondary" onClick={() => void resolveCode(activeResult.code)}>
              <RefreshCw aria-hidden="true" className="size-4" />
              Réessayer
            </Button>
          ) : null}
        </InlineNotice>
      ) : null}

      {lookupMessage ? (
        <InlineNotice
          className="mt-4"
          tone={lookupStatus === 'ready' ? 'success' : 'info'}
          title={lookupStatus === 'ready' ? 'Produit prêt' : 'Produit non disponible'}
        >
          {lookupMessage}
        </InlineNotice>
      ) : null}

      {(lookupStatus === 'missing' || lookupStatus === 'error') && fallbackBarcode ? (
        <Card className="mt-4 min-w-0 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Solutions de secours</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              to={newFoodProductForMealPath(date, mealSlot, fallbackBarcode)}
              state={location.state}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <SquarePen aria-hidden="true" className="size-4" />
              Créer l’aliment manuellement
            </Link>
            <Link
              to={selectFoodPath(date, mealSlot, undefined, 'openFoodFacts')}
              state={location.state}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Search aria-hidden="true" className="size-4" />
              Rechercher par texte
            </Link>
          </div>
          {lookupResult?.status === 'archived' ? (
            <Link
              to={routePaths.foodProducts}
              className="mt-3 inline-flex text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
            >
              Consulter les aliments archivés
            </Link>
          ) : null}
        </Card>
      ) : null}

      {resolvedProduct ? (
        <Card className="mt-5 min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Produit prêt
              </p>
              <p className="mt-1 break-words text-lg font-semibold text-slate-950 dark:text-white">
                {resolvedProduct.name}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {Math.round(resolvedProduct.nutritionPer100.caloriesKcal)} kcal pour 100 {resolvedProduct.basisUnit}
              </p>
            </div>
            <Button className="w-full sm:w-auto" onClick={() => setEntryDialogOpen(true)}>
              Régler la quantité
            </Button>
          </div>
        </Card>
      ) : null}

      <CollapsibleSection
        className="mt-6"
        title="Saisir le code manuellement"
        description="Solution de secours si la caméra est refusée ou ne reconnaît pas le produit."
        defaultOpen={!secureCameraAvailable || status === 'error'}
      >
        <label htmlFor="manual-barcode" className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
          Code-barres
        </label>
        <input
          id="manual-barcode"
          value={manualValue}
          onChange={(event) => {
            setManualValue(event.target.value);
            setManualError(undefined);
            setManualResult(undefined);
            lastAutomaticCodeRef.current = undefined;
            clearLookup();
          }}
          className={`${inputClassName} mt-2 font-mono`}
          inputMode="numeric"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="3017624010701"
        />
        {manualError ? <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">{manualError}</p> : null}
        <Button className="mt-4 w-full sm:w-auto" variant="secondary" onClick={() => void validateManualEntry()}>
          <Search aria-hidden="true" className="size-4" />
          Rechercher ce produit
        </Button>
      </CollapsibleSection>

      <FoodEntryQuickDialog
        product={entryDialogOpen ? resolvedProduct : undefined}
        date={date}
        mealSlot={mealSlot}
        errorMessage={submitError}
        onClose={() => {
          setEntryDialogOpen(false);
          setSubmitError(undefined);
        }}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
