import { Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';

interface SaveFavoriteMealFormProps {
  disabled: boolean;
  suggestedName: string;
  onSave: (name: string) => Promise<unknown>;
}

export function SaveFavoriteMealForm({ disabled, suggestedName, onSave }: SaveFavoriteMealFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(name);
    setOpen(false);
  };

  if (!open) {
    return <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setOpen(true)}><Save aria-hidden="true" className="size-4" />Enregistrer comme favori</Button>;
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row dark:bg-slate-900">
      <label htmlFor={`favorite-name-${suggestedName}`} className="sr-only">Nom du repas favori</label>
      <input id={`favorite-name-${suggestedName}`} value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} placeholder="Nom du favori" minLength={2} required />
      <div className="flex gap-2"><Button size="sm" type="submit" disabled={disabled || name.trim().length < 2}>Enregistrer</Button><Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button></div>
    </form>
  );
}
