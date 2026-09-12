CREATE TABLE IF NOT EXISTS ban_appeals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewer_id TEXT,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ban_appeals_guild ON ban_appeals(guild_id);
CREATE INDEX IF NOT EXISTS idx_ban_appeals_status ON ban_appeals(guild_id, status);
