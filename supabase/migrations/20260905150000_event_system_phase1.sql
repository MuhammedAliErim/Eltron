-- Event System Phase 1
-- Tables: events, event_participants, event_winners

-- ============================================
-- events
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'GENERAL' CHECK (event_type IN ('GENERAL', 'COMPETITION', 'TOURNAMENT', 'MEETING', 'OTHER')),
  status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ACTIVE', 'ENDED', 'CANCELLED')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  max_participants INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_guild ON events(guild_id);
CREATE INDEX IF NOT EXISTS idx_events_guild_status ON events(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_events_guild_starts ON events(guild_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_events_creator ON events(creator_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_events" ON events;
CREATE POLICY "service_role_all_events" ON events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- event_participants
-- ============================================
CREATE TABLE IF NOT EXISTS event_participants (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_guild ON event_participants(guild_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_guild_event ON event_participants(guild_id, event_id);

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_event_participants" ON event_participants;
CREATE POLICY "service_role_all_event_participants" ON event_participants
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- event_winners
-- ============================================
CREATE TABLE IF NOT EXISTS event_winners (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_winners_event ON event_winners(event_id);
CREATE INDEX IF NOT EXISTS idx_event_winners_guild ON event_winners(guild_id);

ALTER TABLE event_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_event_winners" ON event_winners;
CREATE POLICY "service_role_all_event_winners" ON event_winners
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
