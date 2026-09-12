CREATE TABLE IF NOT EXISTS lockdowns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  locked_by TEXT NOT NULL,
  reason TEXT DEFAULT 'Server lockdown',
  auto_unlock_minutes INTEGER DEFAULT 0,
  unlock_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lockdowns_guild ON lockdowns(guild_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lockdowns_channel ON lockdowns(channel_id);
