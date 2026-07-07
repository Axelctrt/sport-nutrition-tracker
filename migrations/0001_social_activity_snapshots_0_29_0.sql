-- SportPilot 0.29.0 A6 — snapshots sociaux filtrés par destinataire.
CREATE TABLE IF NOT EXISTS social_activity_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('activity', 'strengthSession')),
  source_activity_id TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('active', 'deleted')),
  visibility TEXT,
  family TEXT,
  activity_type TEXT,
  occurred_on TEXT,
  occurred_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  deletion_reason TEXT,
  mutation_sequence INTEGER NOT NULL CHECK (mutation_sequence >= 1),
  snapshot_json TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_activity_snapshot_source_recipient
ON social_activity_snapshots(owner_user_id, source_kind, source_activity_id, recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_social_activity_snapshot_feed
ON social_activity_snapshots(recipient_user_id, state, occurred_at, occurred_on, updated_at, snapshot_id);

CREATE INDEX IF NOT EXISTS idx_social_activity_snapshot_owner
ON social_activity_snapshots(owner_user_id, updated_at);
