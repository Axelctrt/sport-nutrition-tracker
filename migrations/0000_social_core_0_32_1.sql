-- SportPilot 0.32.1 - reproducible social core for a fresh D1 database.
CREATE TABLE IF NOT EXISTS social_directory_handles (
  handle TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  owner_display_name TEXT NOT NULL,
  reserved_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_social_directory_handles_owner
ON social_directory_handles(owner_user_id);

CREATE TABLE IF NOT EXISTS social_friendships (
  id TEXT PRIMARY KEY,
  user_a_id TEXT NOT NULL,
  user_b_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_social_friendships_user_a
ON social_friendships(user_a_id, status);

CREATE INDEX IF NOT EXISTS idx_social_friendships_user_b
ON social_friendships(user_b_id, status);

CREATE TABLE IF NOT EXISTS social_friend_permissions (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  friend_user_id TEXT NOT NULL,
  friend_handle TEXT NOT NULL,
  sharing_level TEXT NOT NULL,
  detailed_consent TEXT NOT NULL,
  detailed_consent_granted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_friend_permissions_owner_friend
ON social_friend_permissions(owner_user_id, friend_user_id);

CREATE INDEX IF NOT EXISTS idx_social_friend_permissions_owner
ON social_friend_permissions(owner_user_id);

CREATE TABLE IF NOT EXISTS social_friend_requests (
  id TEXT PRIMARY KEY,
  requester_user_id TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  responded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_friend_requests_pair
ON social_friend_requests(requester_user_id, recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_social_friend_requests_recipient
ON social_friend_requests(recipient_user_id, status, requested_at);

CREATE INDEX IF NOT EXISTS idx_social_friend_requests_requester
ON social_friend_requests(requester_user_id, status, requested_at);
