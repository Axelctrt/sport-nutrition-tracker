import { Camera, ImagePlus, X } from 'lucide-react';
import {
  type ChangeEvent,
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import type { SaveProgressPhotoInput } from '@/application/progress-photos/progressPhotoService';
import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from '@/domain/models/progressPhoto';
import { progressPhotoViewLabels } from '@/features/progress-photos/progressPhotoLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { SportPilotStatefulButton } from '@/shared/ui/SportPilotStatefulButton';
import { toLocalDate } from '@/shared/utils/dates';

interface ProgressPhotoAddFormProps {
  onSave: (input: SaveProgressPhotoInput) => Promise<void>;
}

const acceptedImageTypes = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const sourceClassName = 'sp-button relative flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] text-sm';

export function ProgressPhotoAddForm({ onSave }: ProgressPhotoAddFormProps) {
  const [file, setFile] = useState<File | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState('');
  const [date, setDate] = useState(toLocalDate());
  const [view, setView] = useState<ProgressPhotoView>('front');
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string>();
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
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>): void {
    const selectedFile = event.currentTarget.files?.item(0) ?? undefined;

    // Autorise une nouvelle sélection du même fichier, notamment après une
    // erreur de traitement ou après avoir retiré la sélection courante.
    event.currentTarget.value = '';
    if (!selectedFile) return;

    setFile(selectedFile);
    setState('idle');
    setFeedback(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!file || state === 'loading') {
      setState('error');
      setFeedback('Choisis une photo avant de l’enregistrer.');
      return;
    }
    const selectedFile = file;
    const normalizedWeight = weight.trim().replace(',', '.');
    const weightKg = normalizedWeight ? Number(normalizedWeight) : undefined;

    setState('loading');
    setFeedback(undefined);
    try {
      await onSave({
        file: selectedFile,
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
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] text-[var(--sp-accent-primary)]">
          <Camera aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 id="progress-photo-add-title" className="text-lg font-semibold text-[var(--sp-text-primary)]">
            Ajouter une photo
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
            La photo est redimensionnée et stockée dans IndexedDB sur cet appareil.
          </p>
        </div>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={(event) => void submit(event)}>
        <fieldset className="grid gap-3">
          <legend className="mb-3 text-sm font-semibold text-[var(--sp-text-secondary)]">
            Source de la photo
          </legend>
          <label className={sourceClassName}>
            <ImagePlus aria-hidden="true" className="size-5" />
            Choisir une photo
            <input
              type="file"
              accept={acceptedImageTypes}
              className="absolute inset-0 cursor-pointer opacity-0"
              data-testid="progress-photo-input"
              disabled={state === 'loading'}
              onChange={selectFile}
            />
          </label>
          <p className="text-xs text-[var(--sp-text-muted)]">
            JPEG, PNG, WebP ou HEIC · 25 Mo maximum
          </p>
        </fieldset>

        {file ? (
          <div className="flex min-w-0 items-center gap-3 rounded-[var(--sp-radius-control)] border border-[var(--sp-border-subtle)] bg-[var(--sp-surface-muted)] p-3">
            {previewUrl ? (
              <img src={previewUrl} alt="Aperçu de la photo sélectionnée" className="h-20 w-16 shrink-0 rounded-[var(--sp-radius-control)] object-cover" />
            ) : null}
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--sp-text-primary)]">{file.name}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={clearFile}
              disabled={state === 'loading'}
            >
              <X aria-hidden="true" className="size-4" />
              Retirer
            </Button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--sp-text-secondary)]">
            Date
            <input
              type="date"
              value={date}
              required
              max={toLocalDate()}
              onChange={(event) => setDate(event.currentTarget.value)}
              className={inputClassName}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--sp-text-secondary)]">
            Vue
            <select
              value={view}
              onChange={(event) => setView(event.currentTarget.value as ProgressPhotoView)}
              className={inputClassName}
            >
              {PROGRESS_PHOTO_VIEWS.map((value) => (
                <option key={value} value={value}>{progressPhotoViewLabels[value]}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1.5 text-sm font-semibold text-[var(--sp-text-secondary)]">
          Poids associé <span className="font-normal text-[var(--sp-text-muted)]">(facultatif)</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              placeholder="Ex. 72,5"
              onChange={(event) => setWeight(event.currentTarget.value)}
              className={inputClassName}
            />
            <span className="text-sm text-[var(--sp-text-muted)]">kg</span>
          </div>
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-[var(--sp-text-secondary)]">
          Note <span className="font-normal text-[var(--sp-text-muted)]">(facultative)</span>
          <textarea
            value={note}
            maxLength={5_000}
            rows={3}
            placeholder="Contexte, ressenti ou conditions de prise de vue…"
            onChange={(event) => setNote(event.currentTarget.value)}
            className={`${inputClassName} min-h-24 resize-y`}
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
          className="w-full"
          state={state}
          idleLabel="Enregistrer la photo"
          loadingLabel="Compression et enregistrement…"
          successLabel="Photo enregistrée"
          errorLabel="Réessayer"
          type="submit"
        />
      </form>
    </Card>
  );
}
