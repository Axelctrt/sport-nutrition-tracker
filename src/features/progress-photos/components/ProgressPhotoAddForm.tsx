import { Camera, ImagePlus, X } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import type { SaveProgressPhotoInput } from '@/application/progress-photos/progressPhotoService';
import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from '@/domain/models/progressPhoto';
import { progressPhotoViewLabels } from '@/features/progress-photos/progressPhotoLabels';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { SportPilotStatefulButton } from '@/shared/ui/SportPilotStatefulButton';
import { toLocalDate } from '@/shared/utils/dates';

interface ProgressPhotoAddFormProps {
  onSave: (input: SaveProgressPhotoInput) => Promise<void>;
}

export function ProgressPhotoAddForm({ onSave }: ProgressPhotoAddFormProps) {
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState('');
  const [date, setDate] = useState(toLocalDate());
  const [view, setView] = useState<ProgressPhotoView>('front');
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== 'function') {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clearFile(): void {
    setFile(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!file || state === 'loading') {
      setState('error');
      setFeedback('Choisis une photo avant de l’enregistrer.');
      return;
    }
    const normalizedWeight = weight.trim().replace(',', '.');
    const weightKg = normalizedWeight ? Number(normalizedWeight) : undefined;

    setState('loading');
    setFeedback(undefined);
    try {
      await onSave({
        file,
        date,
        view,
        ...(weightKg === undefined ? {} : { weightKg }),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      clearFile();
      setWeight('');
      setNote('');
      setState('success');
      setFeedback('La photo a été enregistrée uniquement dans cet espace local.');
    } catch (error) {
      setState('error');
      setFeedback(
        error instanceof Error
          ? error.message
          : 'La photo ne peut pas être enregistrée.',
      );
    }
  }

  return (
    <Card className="p-4 sm:p-5" aria-labelledby="progress-photo-add-title">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
          <Camera aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 id="progress-photo-add-title" className="text-lg font-semibold text-slate-950 dark:text-white">
            Ajouter une photo
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            La photo est redimensionnée et stockée dans IndexedDB sur cet appareil.
          </p>
        </div>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={(event) => void submit(event)}>
        <label className="relative flex min-h-24 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 p-4 text-brand-950 hover:bg-brand-100 focus-within:ring-2 focus-within:ring-brand-500 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-100 dark:hover:bg-brand-950/50">
          {previewUrl ? (
            <img src={previewUrl} alt="Aperçu de la photo sélectionnée" className="h-20 w-16 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
              <ImagePlus aria-hidden="true" className="size-5" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{file ? 'Changer la photo' : 'Choisir ou prendre une photo'}</span>
            <span className="mt-1 block text-xs leading-5 opacity-80">JPEG, PNG, WebP ou HEIC · 25 Mo maximum</span>
            {file ? <span className="mt-1 block truncate text-xs opacity-80">{file.name}</span> : null}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Choisir une photo de progression"
            onChange={(event) => {
              setFile(event.currentTarget.files?.[0]);
              setState('idle');
              setFeedback(undefined);
            }}
          />
        </label>

        {file ? (
          <button
            type="button"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={clearFile}
            disabled={state === 'loading'}
          >
            <X aria-hidden="true" className="size-4" />
            Retirer la sélection
          </button>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Date
            <input
              type="date"
              value={date}
              required
              max={toLocalDate()}
              onChange={(event) => setDate(event.currentTarget.value)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Vue
            <select
              value={view}
              onChange={(event) => setView(event.currentTarget.value as ProgressPhotoView)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {PROGRESS_PHOTO_VIEWS.map((value) => (
                <option key={value} value={value}>{progressPhotoViewLabels[value]}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Poids associé <span className="font-normal text-slate-500 dark:text-slate-400">(facultatif)</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              placeholder="Ex. 72,5"
              onChange={(event) => setWeight(event.currentTarget.value)}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">kg</span>
          </div>
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Note <span className="font-normal text-slate-500 dark:text-slate-400">(facultative)</span>
          <textarea
            value={note}
            maxLength={5_000}
            rows={3}
            placeholder="Contexte, ressenti ou conditions de prise de vue…"
            onChange={(event) => setNote(event.currentTarget.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>

        {feedback ? (
          <InlineNotice
            tone={state === 'error' ? 'error' : 'success'}
            title={state === 'error' ? 'Enregistrement impossible' : 'Photo enregistrée'}
            role={state === 'error' ? 'alert' : 'status'}
          >
            {feedback}
          </InlineNotice>
        ) : null}

        <SportPilotStatefulButton
          state={state}
          idleLabel="Enregistrer la photo"
          loadingLabel="Compression et enregistrement…"
          successLabel="Photo enregistrée"
          errorLabel="Réessayer"
          fullWidth
          type="submit"
        />
      </form>
    </Card>
  );
}
