import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SelectiveDataResetPanel } from "@/features/settings/components/SelectiveDataResetPanel";
import type {
  SelectiveDataResetPreview,
  SelectiveDataResetResult,
} from "@/infrastructure/database/selectiveDataResetService";

const activityPreview: SelectiveDataResetPreview = {
  requestedCategories: ["activityHistory"],
  resolvedCategories: ["activityHistory"],
  automaticallyIncludedCategories: [],
  includesDerivedReviewData: true,
  tableNames: [
    "dailySteps",
    "activities",
    "weeklyReviews",
    "acceptedCalorieAdjustments",
  ],
  countsByTable: {
    dailySteps: 1,
    activities: 2,
    weeklyReviews: 0,
    acceptedCalorieAdjustments: 0,
  },
  totalRecordCount: 3,
};

const activityResult: SelectiveDataResetResult = {
  requestedCategories: ["activityHistory"],
  resolvedCategories: ["activityHistory"],
  automaticallyIncludedCategories: [],
  includesDerivedReviewData: true,
  tableNames: activityPreview.tableNames,
  deletedCountsByTable: activityPreview.countsByTable,
  deletedRecordCount: 3,
  restoredCatalogExerciseCount: 0,
};

describe("SelectiveDataResetPanel", () => {
  it("prévisualise puis confirme une suppression ciblée", async () => {
    const loadPreview = vi.fn().mockResolvedValue(activityPreview);
    const resetData = vi.fn().mockResolvedValue(activityResult);

    render(
      <SelectiveDataResetPanel
        loadPreview={loadPreview}
        resetData={resetData}
      />,
    );

    expect(screen.getByText(/Le profil, les paramètres/)).toBeInTheDocument();
    expect(screen.queryByText(/supprimer toute la base/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Préparer la réinitialisation" }));
    expect(
      await screen.findByText(/Sélectionne au moins une catégorie/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /Activités et pas/ }));
    fireEvent.click(screen.getByRole("button", { name: "Préparer la réinitialisation" }));

    expect(
      await screen.findByRole("heading", { name: "Confirmer la réinitialisation" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 éléments seront définitivement effacés/)).toBeInTheDocument();
    expect(loadPreview).toHaveBeenCalledWith(["activityHistory"]);

    fireEvent.click(screen.getByRole("button", { name: "Effacer ces données" }));

    expect(
      await screen.findByText("Données sélectionnées effacées"),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 éléments ont été supprimés/)).toBeInTheDocument();
    expect(resetData).toHaveBeenCalledWith(["activityHistory"]);
  });

  it("annonce les dépendances ajoutées automatiquement", async () => {
    const loadPreview = vi.fn().mockResolvedValue({
      ...activityPreview,
      requestedCategories: ["nutritionLibrary"],
      resolvedCategories: ["nutritionHistory", "nutritionLibrary"],
      automaticallyIncludedCategories: ["nutritionHistory"],
      includesDerivedReviewData: true,
      tableNames: ["foodProducts", "meals", "foodEntries"],
      totalRecordCount: 2,
    } satisfies SelectiveDataResetPreview);

    render(<SelectiveDataResetPanel loadPreview={loadPreview} />);

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Bibliothèque nutritionnelle/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Préparer la réinitialisation" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Journal nutritionnel sera ajouté automatiquement/),
      ).toBeInTheDocument();
    });
  });
});
