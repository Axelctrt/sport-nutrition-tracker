import { Database, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";

import type {
  GuestDataImportResult,
  GuestDataImportServiceOptions,
  PreparedGuestDataImport,
} from "@/infrastructure/data-spaces/guestDataImportService";
import { Button } from "@/shared/ui/Button";
import { ConfirmationDialog } from "@/shared/ui/ConfirmationDialog";
import { InlineNotice } from "@/shared/ui/InlineNotice";

type PrepareGuestDataImport = (
  accountFingerprint: string,
  options?: GuestDataImportServiceOptions,
) => Promise<PreparedGuestDataImport>;

type ApplyPreparedGuestDataImport = (
  prepared: PreparedGuestDataImport,
  options?: GuestDataImportServiceOptions,
) => Promise<GuestDataImportResult>;

const defaultPrepareImport: PrepareGuestDataImport = async (...args) => {
  const { prepareGuestDataImport } = await import(
    "@/infrastructure/data-spaces/guestDataImportService"
  );
  return prepareGuestDataImport(...args);
};

const defaultApplyImport: ApplyPreparedGuestDataImport = async (...args) => {
  const { applyPreparedGuestDataImport } = await import(
    "@/infrastructure/data-spaces/guestDataImportService"
  );
  return applyPreparedGuestDataImport(...args);
};

interface GuestDataImportPanelProps {
  readonly accountFingerprint: string;
  readonly prepareImport?: PrepareGuestDataImport;
  readonly applyImport?: ApplyPreparedGuestDataImport;
  readonly reload?: () => void;
  readonly compact?: boolean;
}

type Feedback = {
  readonly tone: "success" | "error" | "info";
  readonly title: string;
  readonly message: string;
};

function defaultReload(): void {
  window.location.reload();
}

function pluralize(
  value: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${value} ${value > 1 ? plural : singular}`;
}

export function GuestDataImportPanel({
  accountFingerprint,
  prepareImport = defaultPrepareImport,
  applyImport = defaultApplyImport,
  reload = defaultReload,
  compact = false,
}: GuestDataImportPanelProps) {
  const [prepared, setPrepared] = useState<PreparedGuestDataImport>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();

  const analyze = async () => {
    setIsAnalyzing(true);
    setFeedback(undefined);
    try {
      setPrepared(await prepareImport(accountFingerprint));
    } catch (error) {
      setPrepared(undefined);
      setFeedback({
        tone: "error",
        title: "Analyse impossible",
        message:
          error instanceof Error
            ? error.message
            : "Les données invitées n’ont pas pu être analysées.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const apply = async () => {
    if (!prepared) return;
    setConfirmationOpen(false);
    setIsImporting(true);
    setFeedback(undefined);
    try {
      const result: GuestDataImportResult = await applyImport(prepared);
      setFeedback({
        tone: "success",
        title: "Import terminé",
        message: `${pluralize(result.importedRecords, "donnée ajoutée", "données ajoutées")}, ${pluralize(result.updatedRecords, "donnée mise à jour", "données mises à jour")}. L’espace invité est resté intact.`,
      });
      reload();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Import interrompu",
        message:
          error instanceof Error
            ? error.message
            : "Les données invitées n’ont pas pu être importées.",
      });
      setIsImporting(false);
    }
  };

  const preview = prepared?.preview;
  const hasChanges = Boolean(
    preview &&
    (preview.recordsToAdd > 0 ||
      preview.recordsToUpdate > 0 ||
      preview.recordsToRemove > 0),
  );

  return (
    <section
      className={
        compact
          ? "rounded-2xl border border-brand-200 p-4 dark:border-brand-900"
          : "rounded-2xl border border-brand-200 bg-brand-50/40 p-5 dark:border-brand-900 dark:bg-brand-950/20"
      }
    >
      <div className="flex items-start gap-3">
        <Database
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300"
        />
        <div>
          <h2 className="font-semibold text-slate-950 dark:text-white">
            Importer les données de l’espace invité
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Analyse puis fusionne le profil, le sport, la nutrition, les pesées
            et les réglages synchronisables. La donnée la plus récente est
            conservée et l’espace invité n’est jamais effacé.
          </p>
        </div>
      </div>

      {feedback ? (
        <div className="mt-4">
          <InlineNotice tone={feedback.tone} title={feedback.title}>
            {feedback.message}
          </InlineNotice>
        </div>
      ) : null}

      {!preview ? (
        <Button
          className="mt-4 w-full"
          variant={compact ? "secondary" : "primary"}
          disabled={isAnalyzing || isImporting}
          onClick={() => void analyze()}
        >
          <RefreshCw
            aria-hidden="true"
            className={`size-4 ${isAnalyzing ? "animate-spin" : ""}`}
          />
          {isAnalyzing ? "Analyse en cours" : "Analyser les données invitées"}
        </Button>
      ) : (
        <div className="mt-4 space-y-4">
          {!preview.hasGuestData ? (
            <InlineNotice tone="info" title="Espace invité vide">
              Aucune donnée utilisateur n’est disponible dans l’espace invité.
            </InlineNotice>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-3 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    À ajouter
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                    {preview.recordsToAdd}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    À mettre à jour
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                    {preview.recordsToUpdate}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    À retirer
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                    {preview.recordsToRemove}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                  {preview.categories
                    .filter(
                      ({
                        guestRecords,
                        recordsToAdd,
                        recordsToUpdate,
                        recordsToRemove,
                      }) =>
                        guestRecords +
                          recordsToAdd +
                          recordsToUpdate +
                          recordsToRemove >
                        0,
                    )
                    .map((category) => (
                      <li
                        key={category.key}
                        className="flex items-center justify-between gap-4 bg-white px-3 py-3 text-sm dark:bg-slate-950"
                      >
                        <div>
                          <p className="font-semibold text-slate-950 dark:text-white">
                            {category.label}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {category.guestRecords} dans l’espace invité
                          </p>
                        </div>
                        <p className="text-right font-semibold text-brand-700 dark:text-brand-300">
                          +{category.recordsToAdd} · ↻{category.recordsToUpdate}
                        </p>
                      </li>
                    ))}
                </ul>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                L’import est atomique : en cas d’erreur, l’espace du compte
                reste inchangé. Les données invitées restent disponibles après
                déconnexion.
              </div>

              <Button
                className="w-full"
                disabled={!hasChanges || isImporting}
                onClick={() => setConfirmationOpen(true)}
              >
                {isImporting
                  ? "Import en cours"
                  : hasChanges
                    ? "Importer dans mon compte"
                    : "Données déjà fusionnées"}
              </Button>
            </>
          )}

          <Button
            className="w-full"
            variant="ghost"
            disabled={isAnalyzing || isImporting}
            onClick={() => void analyze()}
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-4 ${isAnalyzing ? "animate-spin" : ""}`}
            />
            Relancer l’analyse
          </Button>
        </div>
      )}

      <ConfirmationDialog
        open={confirmationOpen}
        title="Importer les données invitées ?"
        description="Les données seront fusionnées dans l’espace du compte. La version la plus récente sera conservée pour chaque élément et l’espace invité restera intact."
        confirmLabel="Importer dans mon compte"
        isPending={isImporting}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => void apply()}
      />
    </section>
  );
}
