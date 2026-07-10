import { ArrowRight, Calculator, X } from 'lucide-react';
import type { ProfileImpactPreview as ProfileImpactPreviewModel } from '@/application/profile/profileImpactService';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

interface ProfileImpactPreviewProps {
  preview: ProfileImpactPreviewModel;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function MacroLine({ label, before, after }: { label: string; before: number; after: number }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <strong>{before.toLocaleString('fr-FR')} g</strong>
      <ArrowRight aria-hidden="true" className="size-4 text-slate-400" />
      <strong>{after.toLocaleString('fr-FR')} g</strong>
    </div>
  );
}

export function ProfileImpactPreview({ preview, isSaving, onConfirm, onCancel }: ProfileImpactPreviewProps) {
  return (
    <Card className="mt-4 border-brand-300 p-4 sm:p-5 dark:border-brand-700" role="region" aria-labelledby="profile-impact-preview-title">
      <div className="flex items-start gap-3">
        <Calculator aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
        <div className="min-w-0 flex-1">
          <h2 id="profile-impact-preview-title" className="text-lg font-bold text-slate-950 dark:text-white">
            Vérifier l’impact avant d’enregistrer
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Calcul pour le {preview.date.split('-').reverse().join('/')} avec les données et activités déjà enregistrées. Les journées passées ne seront pas réécrites.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Calories quotidiennes</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xl font-bold text-slate-950 dark:text-white">
          <span>{preview.before.targetCaloriesKcal.toLocaleString('fr-FR')} kcal</span>
          <ArrowRight aria-hidden="true" className="size-5 text-brand-600" />
          <span>{preview.after.targetCaloriesKcal.toLocaleString('fr-FR')} kcal</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <MacroLine label="Protéines" before={preview.before.macros.proteinGrams} after={preview.after.macros.proteinGrams} />
        <MacroLine label="Glucides" before={preview.before.macros.carbohydratesGrams} after={preview.after.macros.carbohydratesGrams} />
        <MacroLine label="Lipides" before={preview.before.macros.fatGrams} after={preview.after.macros.fatGrams} />
      </div>

      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Données modifiées : {preview.changedFieldLabels.join(', ')}.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          <X aria-hidden="true" className="size-4" />
          Revenir au formulaire
        </Button>
        <Button onClick={onConfirm} loading={isSaving} loadingLabel="Enregistrement…">
          Confirmer les changements
        </Button>
      </div>
    </Card>
  );
}
