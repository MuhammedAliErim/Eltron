CREATE TABLE IF NOT EXISTS message_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_content TEXT,
  new_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_logs_guild ON message_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_created ON message_logs(guild_id, created_at DESC);
