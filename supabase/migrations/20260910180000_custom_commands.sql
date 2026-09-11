CREATE TABLE IF NOT EXISTS custom_commands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  response TEXT NOT NULL,
  description TEXT DEFAULT '',
  aliases TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  cooldown_seconds INTEGER DEFAULT 0,
  requires_permission TEXT,
  embed_color TEXT,
  dm_response BOOLEAN DEFAULT false,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_commands_guild_name ON custom_commands(guild_id, name);
