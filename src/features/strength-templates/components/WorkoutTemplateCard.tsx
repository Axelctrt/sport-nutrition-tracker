import { Archive, Copy, Pencil, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorkoutTemplateSummary } from '@/application/strength/workoutTemplateService';
import { editWorkoutTemplatePath } from '@/app/routePaths';
import { ActionMenu } from '@/shared/ui/ActionMenu';
import { Button } from '@/shared/ui/Button';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { ExpandableCard } from '@/shared/ui/ExpandableCard';
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
  const [expanded, setExpanded] = useState(false);
  const details = template.description || template.notes ? (
    <div className="grid gap-4">
      {template.description ? (
        <section aria-label="Description de la séance">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Description</p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{template.description}</p>
        </section>
      ) : null}
      {template.notes ? (
        <section aria-label="Notes de la séance">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Notes de la séance</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{template.notes}</p>
        </section>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <ExpandableCard
        className={cn(template.isArchived && 'opacity-70')}
        expanded={expanded}
        onExpandedChange={setExpanded}
        expandLabel={`Afficher les détails de ${template.name}`}
        collapseLabel={`Masquer les détails de ${template.name}`}
        details={details}
        summary={(
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-lg font-semibold text-slate-950 dark:text-white">{template.name}</h2>
              {template.isArchived ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold dark:bg-slate-700">Archivée</span> : null}
            </div>
            <p className="mt-1 text-sm font-medium text-brand-700 dark:text-brand-300">
              {exerciseCount} exercice{exerciseCount > 1 ? 's' : ''}
            </p>

            {!template.isArchived ? (
              <Button className="mt-4 w-full sm:w-auto" disabled={busy} onClick={() => void onStart(template.id)}>
                <Play aria-hidden="true" className="size-4" />
                {busy ? 'Démarrage…' : 'Démarrer la séance'}
              </Button>
            ) : null}
          </div>
        )}
        actions={(
          <ActionMenu label={`Actions pour ${template.name}`} width="wide">
            <Link to={editWorkoutTemplatePath(template.id)} className="inline-flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
              <Pencil aria-hidden="true" className="size-4" />
              Modifier
            </Link>
            <Button className="w-full justify-start" size="sm" variant="ghost" disabled={busy} onClick={() => void onDuplicate(template.id)}>
              <Copy aria-hidden="true" className="size-4" />
              Dupliquer
            </Button>
            <Button className="w-full justify-start" size="sm" variant={template.isArchived ? 'ghost' : 'dangerGhost'} disabled={busy} onClick={() => setConfirmationOpen(true)}>
              {template.isArchived ? <RotateCcw aria-hidden="true" className="size-4" /> : <Archive aria-hidden="true" className="size-4" />}
              {template.isArchived ? 'Réactiver' : 'Archiver'}
            </Button>
          </ActionMenu>
        )}
      />

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
