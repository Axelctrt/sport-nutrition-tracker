import type { MigrationJournalEntry } from "@/infrastructure/database/migrationJournal";

export type DatabaseIntegrityStatus = "healthy" | "warning" | "error";
export type DatabaseIntegrityIssueSeverity = "warning" | "error";

export interface DatabaseIntegrityIssue {
  code: string;
  severity: DatabaseIntegrityIssueSeverity;
  message: string;
  tableName: string | null;
}

export interface DatabaseTableIntegrityCheck {
  tableName: string;
  accessible: boolean;
  recordCount: number | null;
  errorMessage: string | null;
}

export interface DatabaseIntegrityReport {
  id: "latest";
  checkedAt: string;
  databaseName: string;
  schemaVersion: number;
  expectedSchemaVersion: number;
  expectedTableCount: number;
  accessibleTableCount: number;
  totalRecordCount: number;
  status: DatabaseIntegrityStatus;
  tableChecks: DatabaseTableIntegrityCheck[];
  latestMigration: MigrationJournalEntry | null;
  issues: DatabaseIntegrityIssue[];
}
