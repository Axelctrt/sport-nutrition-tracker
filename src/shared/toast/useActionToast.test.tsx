import { fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider } from "@/shared/toast/ToastProvider";
import { consumePendingToast } from "@/shared/toast/pendingToast";
import {
  getActionErrorMessage,
  useActionToast,
} from "@/shared/toast/useActionToast";

function Harness() {
  const actionToast = useActionToast();

  return (
    <>
      <button
        type="button"
        onClick={() =>
          actionToast.success({
            key: "profile-save",
            title: "Profil mis à jour",
            description: "Les nouvelles valeurs sont enregistrées.",
          })
        }
      >
        Succès
      </button>
      <button
        type="button"
        onClick={() =>
          actionToast.successAfterReload({
            key: "account-disconnect",
            title: "Compte déconnecté",
          })
        }
      >
        Après rechargement
      </button>
      <button
        type="button"
        onClick={() =>
          actionToast.error({
            key: "profile-save",
            error: new Error("Base indisponible"),
            fallback: "Le profil n’a pas pu être enregistré.",
          })
        }
      >
        Erreur
      </button>
    </>
  );
}

describe("useActionToast", () => {
  it("publie un succès et déduplique une même action", () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Succès" }));
    fireEvent.click(screen.getByRole("button", { name: "Succès" }));

    expect(screen.getAllByText("Profil mis à jour")).toHaveLength(1);
    expect(
      screen.getByText("Les nouvelles valeurs sont enregistrées."),
    ).toBeInTheDocument();
  });

  it("prépare une confirmation pour le prochain chargement", () => {
    sessionStorage.clear();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Après rechargement" }));

    expect(consumePendingToast()).toMatchObject({
      title: "Compte déconnecté",
      tone: "success",
    });
  });

  it("publie le message réel d’une erreur", () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Erreur" }));

    expect(screen.getByText("Modification impossible")).toBeInTheDocument();
    expect(screen.getByText("Base indisponible")).toBeInTheDocument();
  });

  it("utilise le message de secours pour une erreur inconnue", () => {
    expect(getActionErrorMessage(null, "Échec générique")).toBe(
      "Échec générique",
    );
  });
});
