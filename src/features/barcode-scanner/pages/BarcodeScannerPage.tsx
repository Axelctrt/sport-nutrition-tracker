import { ArrowLeft, Camera, CameraOff, RefreshCw, ScanLine } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { selectFoodPath } from '@/app/routePaths';
import type { MealSlot } from '@/domain/models/food';
import { useBarcodeScanner } from '@/features/barcode-scanner/hooks/useBarcodeScanner';
import { validateFoodBarcode } from '@/features/barcode-scanner/utils/scannerBarcode';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import type { BarcodeScannerPort } from '@/infrastructure/barcode-scanner/BarcodeScanner';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

const mealSlots: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

function isMealSlot(value: string | null): value is MealSlot {
  return value !== null && mealSlots.includes(value as MealSlot);
}

interface BarcodeScannerPageProps {
  scanner?: BarcodeScannerPort;
}

export function BarcodeScannerPage({ scanner }: BarcodeScannerPageProps = {}) {
  const [searchParams] = useSearchParams();
  const targetRef = useRef<HTMLDivElement>(null);
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

  const validateManualEntry = () => {
    const valid = validateFoodBarcode(manualValue);
    if (!valid) {
      setManualResult(undefined);
      setManualError('Saisis un code EAN-13, EAN-8, UPC-A ou UPC-E uniquement composé de chiffres.');
      return;
    }
    setManualError(undefined);
    setManualResult(valid);
  };

  return (
    <section aria-labelledby="barcode-scanner-title">
      <Link
        to={selectFoodPath(date, mealSlot)}
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
          Repas cible : <strong>{mealSlotLabels[mealSlot]}</strong>. Place le code-barres horizontalement dans la zone centrale et garde le téléphone stable.
        </p>
      </div>

      <InlineNotice className="mt-6" title="Connexion sécurisée obligatoire">
        La caméra fonctionne uniquement en HTTPS ou sur localhost. Une adresse locale comme <code>http://192.168.x.x</code> ne permet pas l’accès à la caméra sur téléphone.
      </InlineNotice>

      {!secureCameraAvailable ? (
        <InlineNotice className="mt-4" tone="error" title="Caméra indisponible sur cette adresse">
          Ouvre la version HTTPS déployée de SportPilot pour tester la caméra. La saisie manuelle ci-dessous reste disponible.
        </InlineNotice>
      ) : null}

      <Card className="mt-6 min-w-0 overflow-hidden p-4 sm:p-6">
        <div
          ref={targetRef}
          data-testid="barcode-scanner-target"
          className="barcode-scanner-viewport relative aspect-[4/3] min-h-64 w-full overflow-hidden rounded-2xl bg-slate-950"
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
              onClick={() => void start(targetRef.current)}
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
          {(status === 'error' || status === 'detected') ? (
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              onClick={() => {
                setManualResult(undefined);
                reset();
              }}
            >
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

      <Card className="mt-6 min-w-0 p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Saisie manuelle</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Utilise cette solution si la caméra est refusée, indisponible ou ne reconnaît pas le code.
        </p>
        <label htmlFor="manual-barcode" className="mt-4 block text-sm font-semibold text-slate-800 dark:text-slate-100">
          Code-barres
        </label>
        <input
          id="manual-barcode"
          value={manualValue}
          onChange={(event) => {
            setManualValue(event.target.value);
            setManualError(undefined);
            setManualResult(undefined);
          }}
          className={`${inputClassName} mt-2 font-mono`}
          inputMode="numeric"
          autoComplete="off"
          placeholder="3017624010701"
        />
        {manualError ? <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">{manualError}</p> : null}
        <Button className="mt-4 w-full sm:w-auto" variant="secondary" onClick={validateManualEntry}>
          Vérifier le code
        </Button>
      </Card>
    </section>
  );
}
