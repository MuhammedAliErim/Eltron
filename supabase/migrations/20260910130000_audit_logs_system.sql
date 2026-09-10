CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  action TEXT NOT NULL,
  moderator_id TEXT,
  target_id TEXT,
  target_type TEXT,
  reason TEXT,
  details JSONB DEFAULT '{}',
  channel_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_guild ON audit_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(guild_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_moderator ON audit_logs(guild_id, moderator_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(guild_id, created_at DESC);
