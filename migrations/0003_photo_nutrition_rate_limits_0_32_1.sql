-- SportPilot 0.32.1 - per-account photo analysis quota for Pages Functions.
CREATE TABLE IF NOT EXISTS photo_nutrition_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photo_nutrition_rate_limits_expiry
ON photo_nutrition_rate_limits(expires_at);
