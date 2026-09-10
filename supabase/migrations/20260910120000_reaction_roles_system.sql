CREATE TABLE IF NOT EXISTS reaction_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#5865F2',
  emoji TEXT NOT NULL,
  role_id TEXT NOT NULL,
  max_uses INTEGER DEFAULT 0,
  current_uses INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reaction_roles_guild ON reaction_roles(guild_id);
CREATE INDEX IF NOT EXISTS idx_reaction_roles_message ON reaction_roles(message_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reaction_roles_message_emoji ON reaction_roles(message_id, emoji);
