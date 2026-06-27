import type Dexie from 'dexie';

import { registerVersion1 } from '@/infrastructure/database/migrations/version1';
import { registerVersion2 } from '@/infrastructure/database/migrations/version2';

function createVersionRecorder(registeredVersions: number[]): Dexie {
  return {
    version(versionNumber: number) {
      registeredVersions.push(versionNumber);

      return {
        stores() {
          return this;
        },
      };
    },
  } as unknown as Dexie;
}

describe('déclaration des versions Dexie', () => {
  it('enregistre les versions historiques 1 puis 2', () => {
    const registeredVersions: number[] = [];
    const recorder = createVersionRecorder(registeredVersions);

    registerVersion1(recorder);
    registerVersion2(recorder);

    expect(registeredVersions).toEqual([1, 2]);
  });
});
