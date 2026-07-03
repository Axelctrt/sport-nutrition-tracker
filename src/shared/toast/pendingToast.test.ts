import {
  consumePendingToast,
  pendingToastStorageKey,
  queuePendingToast,
} from "@/shared/toast/pendingToast";

describe("pendingToast", () => {
  beforeEach(() => sessionStorage.clear());

  it("conserve une notification sérialisable jusqu’au prochain chargement", () => {
    queuePendingToast({
      title: "Import terminé",
      description: "12 données ajoutées.",
      tone: "success",
      dedupeKey: "action-success:guest-import",
    });

    expect(consumePendingToast()).toEqual({
      title: "Import terminé",
      description: "12 données ajoutées.",
      tone: "success",
      dedupeKey: "action-success:guest-import",
    });
    expect(sessionStorage.getItem(pendingToastStorageKey)).toBeNull();
  });

  it("ignore et retire une valeur corrompue", () => {
    sessionStorage.setItem(pendingToastStorageKey, "{invalide");

    expect(consumePendingToast()).toBeUndefined();
    expect(sessionStorage.getItem(pendingToastStorageKey)).toBeNull();
  });
});
