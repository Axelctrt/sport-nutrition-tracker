import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  getSelectiveDataResetPreview,
  resetSelectedData,
  selectiveDataResetCategories,
  selectiveDataResetCategoryNames,
  type SelectiveDataResetCategory,
  type SelectiveDataResetPreview,
  type SelectiveDataResetResult,
} from "@/infrastructure/database/selectiveDataResetService";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ConfirmationDialog } from "@/shared/ui/ConfirmationDialog";
import { InlineNotice } from "@/shared/ui/InlineNotice";

interface SelectiveDataResetPanelProps {
  className?: string;
  loadPreview?: (
    categories: readonly SelectiveDataResetCategory[],
  ) => Promise<SelectiveDataResetPreview>;
  resetData?: (
    categories: readonly SelectiveDataResetCategory[],
  ) => Promise<SelectiveDataResetResult>;
}

function categoryTitle(categoryName: SelectiveDataResetCategory): string {
  return (
    selectiveDataResetCategories.find(
      (category) => category.name === categoryName,
    )?.title ?? categoryName
  );
}

function formatRecordCount(count: number): string {
  return `${count} ${count > 1 ? "éléments" : "élément"}`;
}

function formatDeletionWarning(count: number): string {
  return `${formatRecordCount(count)} ${
    count > 1 ? "seront définitivement effacés" : "sera définitivement effacé"
  }.`;
}

function formatDeletionResult(count: number): string {
  return `${formatRecordCount(count)} ${
    count > 1 ? "ont été supprimés" : "a été supprimé"
  }.`;
}

export function SelectiveDataResetPanel({
  className,
  loadPreview = getSelectiveDataResetPreview,
  resetData = resetSelectedData,
}: SelectiveDataResetPanelProps) {
  const [selectedCategories, setSelectedCategories] = useState<
    SelectiveDataResetCategory[]
  >([]);
  const [preview, setPreview] = useState<SelectiveDataResetPreview | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SelectiveDataResetResult | null>(null);

  const allSelected =
    selectedCategories.length === selectiveDataResetCategoryNames.length;
  const classNames = ["p-4 sm:p-5", className].filter(Boolean).join(" ");

  const confirmationDescription = useMemo(() => {
    if (!preview) return "";

    const details = [
      formatDeletionWarning(preview.totalRecordCount),
    ];

    if (preview.automaticallyIncludedCategories.length > 0) {
      details.push(
        `${preview.automaticallyIncludedCategories
          .map(categoryTitle)
          .join(", ")} ${
          preview.automaticallyIncludedCategories.length > 1
            ? "seront ajoutés automatiquement"
            : "sera ajouté automatiquement"
        } pour préserver la cohérence des données.`,
      );
    }

    if (preview.includesDerivedReviewData) {
      details.push(
        "Les bilans hebdomadaires et ajustements caloriques dérivés seront également supprimés.",
      );
    }

    details.push("Le profil et les paramètres seront conservés.");
    return details.join(" ");
  }, [preview]);

  const toggleCategory = (category: SelectiveDataResetCategory) => {
    setError(null);
    setResult(null);
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : selectiveDataResetCategoryNames.filter(
            (item) => item === category || current.includes(item),
          ),
    );
  };

  const toggleAll = () => {
    setError(null);
    setResult(null);
    setSelectedCategories(
      allSelected ? [] : [...selectiveDataResetCategoryNames],
    );
  };

  const prepareReset = async () => {
    setError(null);
    setResult(null);

    if (selectedCategories.length === 0) {
      setError("Sélectionne au moins une catégorie de données à réinitialiser.");
      return;
    }

    setIsPreparing(true);
    try {
      setPreview(await loadPreview(selectedCategories));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "La préparation de la réinitialisation a échoué.",
      );
    } finally {
      setIsPreparing(false);
    }
  };

  const confirmReset = async () => {
    if (!preview) return;

    setIsResetting(true);
    setError(null);
    try {
      const resetResult = await resetData(preview.requestedCategories);
      setResult(resetResult);
      setSelectedCategories([]);
      setPreview(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "La réinitialisation sélective a échoué.",
      );
      setPreview(null);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Card className={classNames}>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <Trash2 aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  Réinitialisation sélective
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Efface uniquement les catégories choisies afin de retirer les
                  données de test sans repartir de zéro.
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={toggleAll}>
                {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </Button>
            </div>

            <InlineNotice
              className="mt-4"
              title="Toujours conservés"
              tone="info"
            >
              Le profil, les paramètres, le journal des migrations et les
              diagnostics techniques ne sont jamais supprimés ici.
            </InlineNotice>

            <fieldset className="mt-4 space-y-3">
              <legend className="text-sm font-semibold text-slate-950 dark:text-white">
                Données à effacer
              </legend>
              {selectiveDataResetCategories.map((category) => (
                <label
                  key={category.name}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-brand-700"
                    checked={selectedCategories.includes(category.name)}
                    onChange={() => toggleCategory(category.name)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-950 dark:text-white">
                      {category.title}
                    </span>
                    <span className="mt-0.5 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                      {category.description}
                    </span>
                    {category.dependencyDescription ? (
                      <span className="mt-1 block text-xs leading-5 text-amber-700 dark:text-amber-300">
                        {category.dependencyDescription}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </fieldset>

            {error ? (
              <InlineNotice
                className="mt-4"
                tone="error"
                title="Réinitialisation impossible"
                role="alert"
              >
                {error}
              </InlineNotice>
            ) : null}

            {result ? (
              <InlineNotice
                className="mt-4"
                tone="success"
                title="Données sélectionnées effacées"
                role="status"
              >
                {formatDeletionResult(result.deletedRecordCount)}
                {result.restoredCatalogExerciseCount > 0
                  ? ` ${result.restoredCatalogExerciseCount} exercices du catalogue système ont été recréés.`
                  : ""}
              </InlineNotice>
            ) : null}

            <div className="mt-4 flex justify-end">
              <Button
                variant="danger"
                disabled={isPreparing || isResetting}
                onClick={() => void prepareReset()}
              >
                {isPreparing
                  ? "Analyse en cours…"
                  : "Préparer la réinitialisation"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmationDialog
        open={preview !== null}
        title="Confirmer la réinitialisation"
        description={confirmationDescription}
        confirmLabel="Effacer ces données"
        tone="danger"
        isPending={isResetting}
        onConfirm={() => void confirmReset()}
        onCancel={() => {
          if (!isResetting) setPreview(null);
        }}
      />
    </>
  );
}
