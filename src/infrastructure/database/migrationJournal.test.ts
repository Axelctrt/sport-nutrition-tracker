import Dexie from "dexie";

import { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { initializeDatabase } from "@/infrastructure/database/databaseLifecycle";
import {
  DATABASE_VERSION_2,
  DATABASE_VERSION_3,
  DATABASE_VERSION_7,
} from "@/infrastructure/database/migrations/versions";
import { schemaVersion2 } from "@/infrastructure/database/schema";

function createDatabaseName(): string {
  return `sportpilot-migration-journal-${crypto.randomUUID()}`;
}

describe("journal des migrations", () => {
  it("journalise une initialisation fraîche une seule fois", async () => {
    const database = new AppDatabase(createDatabaseName());

    try {
      await initializeDatabase(database);
      await initializeDatabase(database);

      const entries = await database.migrationJournal.toArray();

      expect(database.verno).toBe(DATABASE_VERSION_7);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        id: `schema-version-${DATABASE_VERSION_7}`,
        version: DATABASE_VERSION_7,
        previousVersion: null,
        status: "succeeded",
        source: "initialization",
      });
    } finally {
      database.close();
      await database.delete();
    }
  });

  it("conserve les données v2 et journalise la migration vers la v3", async () => {
    const databaseName = createDatabaseName();
    const oldDatabase = new Dexie(databaseName);
    let upgradedDatabase: AppDatabase | undefined;

    try {
      oldDatabase.version(DATABASE_VERSION_2).stores(schemaVersion2);
      await oldDatabase.open();
      await oldDatabase.table("userProfile").add({
        id: "migration-user",
        firstName: "Migration",
      });
      oldDatabase.close();

      upgradedDatabase = new AppDatabase(databaseName);
      await upgradedDatabase.open();

      expect(await upgradedDatabase.userProfile.get("migration-user")).toEqual({
        id: "migration-user",
        firstName: "Migration",
      });
      expect(
        await upgradedDatabase.migrationJournal.get(
          `schema-version-${DATABASE_VERSION_3}`,
        ),
      ).toMatchObject({
        version: DATABASE_VERSION_3,
        previousVersion: DATABASE_VERSION_2,
        status: "succeeded",
        source: "migration",
      });
    } finally {
      oldDatabase.close();
      upgradedDatabase?.close();
      await Dexie.delete(databaseName);
    }
  });
});
