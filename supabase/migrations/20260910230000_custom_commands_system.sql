CREATE TABLE IF NOT EXISTS custom_commands (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  response TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  embed_color TEXT,
  use_count INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, name)
);

CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);

CREATE TABLE IF NOT EXISTS counting_config (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL UNIQUE,
  channel_id TEXT,
  current_number INTEGER DEFAULT 0,
  highest_number INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counting_scores (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  UNIQUE(guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_counting_scores_guild ON counting_scores(guild_id);

CREATE TABLE IF NOT EXISTS stats_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT DEFAULT '',
  type TEXT NOT NULL,
  format TEXT DEFAULT '{count}',
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stats_channels_guild ON stats_channels(guild_id);
