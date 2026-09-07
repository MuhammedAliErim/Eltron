-- Analytics System Phase 1
-- Table: guild_analytics_daily

CREATE TABLE IF NOT EXISTS guild_analytics_daily (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Messages
  messages_total BIGINT DEFAULT 0,
  messages_deleted BIGINT DEFAULT 0,

  -- Members
  members_joined BIGINT DEFAULT 0,
  members_left BIGINT DEFAULT 0,

  -- Moderation
  moderation_actions BIGINT DEFAULT 0,
  warnings BIGINT DEFAULT 0,
  timeouts BIGINT DEFAULT 0,
  kicks BIGINT DEFAULT 0,
  bans BIGINT DEFAULT 0,

  -- Security
  automod_actions BIGINT DEFAULT 0,
  spam_detections BIGINT DEFAULT 0,
  raid_detections BIGINT DEFAULT 0,
  verification_events BIGINT DEFAULT 0,
  quarantine_events BIGINT DEFAULT 0,

  -- Tickets
  tickets_created BIGINT DEFAULT 0,
  tickets_closed BIGINT DEFAULT 0,

  -- Applications
  applications_submitted BIGINT DEFAULT 0,
  applications_approved BIGINT DEFAULT 0,
  applications_rejected BIGINT DEFAULT 0,

  -- Engagement
  giveaways_created BIGINT DEFAULT 0,
  giveaway_entries BIGINT DEFAULT 0,
  events_created BIGINT DEFAULT 0,
  event_participants BIGINT DEFAULT 0,
  polls_created BIGINT DEFAULT 0,
  poll_votes BIGINT DEFAULT 0,
  reminders_created BIGINT DEFAULT 0,

  -- XP
  xp_awarded BIGINT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(guild_id, date)
);

CREATE INDEX IF NOT EXISTS idx_guild_analytics_daily_guild ON guild_analytics_daily(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_analytics_daily_date ON guild_analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_guild_analytics_daily_guild_date ON guild_analytics_daily(guild_id, date);

ALTER TABLE guild_analytics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_guild_analytics_daily" ON guild_analytics_daily;
CREATE POLICY "service_role_all_guild_analytics_daily" ON guild_analytics_daily
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_guild_analytics_daily_updated_at ON guild_analytics_daily;
CREATE TRIGGER update_guild_analytics_daily_updated_at BEFORE UPDATE ON guild_analytics_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
