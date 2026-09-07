-- Migration: Critical database functions for Eltron Bot
-- Creates missing RPC functions and utility functions

-- 1. Updated_at trigger function (used by ALL tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Per-guild case number sequence function
CREATE OR REPLACE FUNCTION get_next_case_number(p_guild_id TEXT)
RETURNS BIGINT AS $$
DECLARE
  v_next BIGINT;
BEGIN
  -- Lock the row to prevent race conditions
  PERFORM pg_advisory_xact_lock(
    hashtext('case_number_' || p_guild_id)
  );

  SELECT COALESCE(MAX(case_id), 0) + 1 INTO v_next
  FROM moderation_cases
  WHERE guild_id = p_guild_id;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- 3. Analytics metric increment function (dynamic column update)
CREATE OR REPLACE FUNCTION increment_analytics_metric(
  p_guild_id TEXT,
  p_date DATE,
  p_metric TEXT,
  p_increment BIGINT DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  -- Ensure row exists
  INSERT INTO guild_analytics_daily (guild_id, date)
  VALUES (p_guild_id, p_date)
  ON CONFLICT (guild_id, date) DO NOTHING;

  -- Dynamic column update
  EXECUTE format(
    'UPDATE guild_analytics_daily SET %I = GREATEST(0, COALESCE(%I, 0) + $1) WHERE guild_id = $2 AND date = $3',
    p_metric, p_metric
  )
  USING p_increment, p_guild_id, p_date;
END;
$$ LANGUAGE plpgsql;

-- 4. Composite index for pending reminders with due date
CREATE INDEX IF NOT EXISTS idx_reminders_pending_due
  ON reminders (remind_at)
  WHERE status = 'PENDING';

-- 5. Partial index for active giveaways
CREATE INDEX IF NOT EXISTS idx_giveaways_active
  ON giveaways (ends_at)
  WHERE status = 'ACTIVE';

-- 6. Partial index for active events
CREATE INDEX IF NOT EXISTS idx_events_active
  ON events (start_time)
  WHERE status IN ('UPCOMING', 'ACTIVE');

-- 7. Partial index for active polls
CREATE INDEX IF NOT EXISTS idx_polls_active
  ON polls (ends_at)
  WHERE status = 'ACTIVE';

-- 8. Analytics: remove redundant single-column index (composite covers it)
DROP INDEX IF EXISTS idx_guild_analytics_daily_guild;
