import { Archive, Copy, MoreHorizontal, Pencil, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorkoutTemplateSummary } from '@/application/strength/workoutTemplateService';
import { editWorkoutTemplatePath } from '@/app/routePaths';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { cn } from '@/shared/utils/cn';

interface WorkoutTemplateCardProps {
  summary: WorkoutTemplateSummary;
  busy?: boolean;
  onStart: (templateId: string) => Promise<void>;
  onDuplicate: (templateId: string) => Promise<void>;
  onArchiveChange: (templateId: string, archived: boolean) => Promise<boolean>;
}

export function WorkoutTemplateCard({ summary, busy = false, onStart, onDuplicate, onArchiveChange }: WorkoutTemplateCardProps) {
  const { template, exerciseCount } = summary;
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  return (
    <>
      <Card className={cn('p-4 sm:p-5', template.isArchived && 'opacity-70')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-lg font-semibold text-slate-950 dark:text-white">{template.name}</h2>
              {template.isArchived ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold dark:bg-slate-700">Archivée</span> : null}
            </div>
            <p className="mt-1 text-sm font-medium text-brand-700 dark:text-brand-300">
              {exerciseCount} exercice{exerciseCount > 1 ? 's' : ''}
            </p>
          </div>

          <details className="relative shrink-0">
            <summary role="button" aria-label={`Actions pour ${template.name}`} className="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
              <MoreHorizontal aria-hidden="true" className="size-5" />
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <Link to={editWorkoutTemplatePath(template.id)} onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')} className="inline-flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                <Pencil aria-hidden="true" className="size-4" />
                Modifier
              </Link>
              <Button className="w-full justify-start" size="sm" variant="ghost" disabled={busy} onClick={(event) => {
                event.currentTarget.closest('details')?.removeAttribute('open');
                void onDuplicate(template.id);
              }}>
                <Copy aria-hidden="true" className="size-4" />
                Dupliquer
              </Button>
              <Button className="w-full justify-start" size="sm" variant={template.isArchived ? 'ghost' : 'dangerGhost'} disabled={busy} onClick={(event) => {
                event.currentTarget.closest('details')?.removeAttribute('open');
                setConfirmationOpen(true);
              }}>
                {template.isArchived ? <RotateCcw aria-hidden="true" className="size-4" /> : <Archive aria-hidden="true" className="size-4" />}
                {template.isArchived ? 'Réactiver' : 'Archiver'}
              </Button>
            </div>
          </details>
        </div>

        {template.description ? <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{template.description}</p> : null}
        {template.notes ? (
          <details className="mt-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">Notes de la séance</summary>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{template.notes}</p>
          </details>
        ) : null}

        {!template.isArchived ? (
          <Button className="mt-4 w-full sm:w-auto" disabled={busy} onClick={() => void onStart(template.id)}>
            <Play aria-hidden="true" className="size-4" />
            {busy ? 'Démarrage…' : 'Démarrer la séance'}
          </Button>
        ) : null}
      </Card>

      <ConfirmationDialog
        open={confirmationOpen}
        title={template.isArchived ? 'Réactiver cette séance modèle ?' : 'Archiver cette séance modèle ?'}
        description={template.isArchived
          ? `« ${template.name} » pourra de nouveau être utilisée pour démarrer un entraînement.`
          : `« ${template.name} » ne pourra plus être démarrée, mais ses anciennes séances resteront conservées.`}
        confirmLabel={template.isArchived ? 'Réactiver' : 'Archiver'}
        tone={template.isArchived ? 'default' : 'danger'}
        isPending={busy}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => {
          void onArchiveChange(template.id, !template.isArchived).then((success) => {
            if (success) setConfirmationOpen(false);
          });
        }}
      />
    </>
  );
}
