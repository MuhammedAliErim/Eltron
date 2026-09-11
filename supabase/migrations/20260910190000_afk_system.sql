CREATE TABLE IF NOT EXISTS afk_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reason TEXT DEFAULT 'AFK',
  channel_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_afk_users_guild ON afk_users(guild_id);
