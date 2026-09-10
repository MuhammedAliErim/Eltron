CREATE TABLE IF NOT EXISTS auto_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  trigger_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'contains',
  channel_ids TEXT[] DEFAULT '{}',
  excluded_channel_ids TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  cooldown_seconds INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_responses_guild ON auto_responses(guild_id);
