import type Dexie from "dexie";

import { registerVersion1 } from "@/infrastructure/database/migrations/version1";
import { registerVersion2 } from "@/infrastructure/database/migrations/version2";
import { registerVersion3 } from "@/infrastructure/database/migrations/version3";
import { registerVersion4 } from "@/infrastructure/database/migrations/version4";
import { registerVersion5 } from '@/infrastructure/database/migrations/version5';

function createVersionRecorder(
  registeredVersions: number[],
): Dexie {
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
  it("enregistre les versions historiques 1 à 5", () => {
    const registeredVersions: number[] = [];
    const recorder = createVersionRecorder(registeredVersions);

    registerVersion1(recorder);
    registerVersion2(recorder);
    registerVersion3(recorder);
    registerVersion4(recorder);
    registerVersion5(recorder);

    expect(registeredVersions).toEqual([1, 2, 3, 4, 5]);
  });
});
