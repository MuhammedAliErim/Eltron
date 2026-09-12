CREATE TABLE IF NOT EXISTS starboard_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL UNIQUE,
  channel_id TEXT NOT NULL,
  emoji TEXT DEFAULT '⭐',
  threshold INTEGER DEFAULT 5,
  self_star BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS starboard_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  original_channel_id TEXT NOT NULL,
  original_message_id TEXT NOT NULL,
  starboard_message_id TEXT,
  author_id TEXT NOT NULL,
  content TEXT,
  star_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_starboard_entries_guild ON starboard_entries(guild_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_starboard_entries_message ON starboard_entries(original_message_id);
