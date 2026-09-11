CREATE TABLE IF NOT EXISTS counting_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  current_number INTEGER DEFAULT 0,
  highest_number INTEGER DEFAULT 0,
  last_user_id TEXT,
  enabled BOOLEAN DEFAULT true,
  reset_on_fail BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counting_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  correct_count INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_counting_scores_guild ON counting_scores(guild_id);
CREATE INDEX IF NOT EXISTS idx_counting_configs_channel ON counting_configs(channel_id);
