import type Dexie from "dexie";

import { registerVersion1 } from "@/infrastructure/database/migrations/version1";
import { registerVersion2 } from "@/infrastructure/database/migrations/version2";
import { registerVersion3 } from "@/infrastructure/database/migrations/version3";

function createVersionRecorder(registeredVersions: number[]): Dexie {
  return {
    version(versionNumber: number) {
      registeredVersions.push(versionNumber);

      return {
        stores() {
          return this;
        },
        upgrade() {
          return this;
        },
      };
    },
  } as unknown as Dexie;
}

describe("déclaration des versions Dexie", () => {
  it("enregistre les versions historiques 1, 2 puis 3", () => {
    const registeredVersions: number[] = [];
    const recorder = createVersionRecorder(registeredVersions);

    registerVersion1(recorder);
    registerVersion2(recorder);
    registerVersion3(recorder);

    expect(registeredVersions).toEqual([1, 2, 3]);
  });
});
