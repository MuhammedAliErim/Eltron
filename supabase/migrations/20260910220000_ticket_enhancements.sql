ALTER TABLE IF EXISTS tickets ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE IF EXISTS tickets ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE IF EXISTS tickets ADD COLUMN IF NOT EXISTS auto_close_hours INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS ticket_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  emoji TEXT DEFAULT '🎫',
  channel_id TEXT,
  auto_response TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_categories_guild ON ticket_categories(guild_id);
