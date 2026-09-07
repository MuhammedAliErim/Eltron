-- Giveaway System Phase 1
-- Safe corrective migration: adapts existing partial giveaways table to target schema
-- All statements are idempotent — safe to re-run
--
-- Existing table has:
--   id, guild_id, channel_id, message_id, prize, winner_count, host_id,
--   end_time (timestamptz), ended (boolean), winners (ARRAY), created_at
--
-- Target schema needs:
--   id, guild_id, channel_id, message_id, prize, winner_count, host_id,
--   description, ends_at (timestamptz), status (TEXT CHECK), created_at, updated_at

-- ============================================
-- 1. giveaways — ALTER EXISTING TABLE
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'giveaways' AND relkind = 'r') THEN

    -- Add 'description' column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'description') THEN
      ALTER TABLE giveaways ADD COLUMN description TEXT DEFAULT '';
    END IF;

    -- Add 'updated_at' column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'updated_at') THEN
      ALTER TABLE giveaways ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add 'ends_at' column if missing (rename from end_time or create new)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'ends_at') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'end_time') THEN
        ALTER TABLE giveaways RENAME COLUMN end_time TO ends_at;
      ELSE
        ALTER TABLE giveaways ADD COLUMN ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      END IF;
    END IF;

    -- Add 'status' column if missing (convert from ended boolean)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'status') THEN
      ALTER TABLE giveaways ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
      -- Backfill from existing 'ended' boolean column
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'ended') THEN
        UPDATE giveaways SET status = 'ENDED' WHERE ended = true;
        UPDATE giveaways SET status = 'ACTIVE' WHERE ended = false;
      END IF;
    END IF;

    -- Drop 'ended' boolean column if it exists (replaced by status)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'ended') THEN
      ALTER TABLE giveaways DROP COLUMN ended;
    END IF;

    -- Drop 'winners' ARRAY column if it exists (we use giveaway_winners table)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'winners') THEN
      ALTER TABLE giveaways DROP COLUMN winners;
    END IF;

    -- Add CHECK constraint if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'giveaways_status_check'
        AND conrelid = 'giveaways'::regclass
    ) THEN
      ALTER TABLE giveaways
        ADD CONSTRAINT giveaways_status_check
        CHECK (status IN ('ACTIVE', 'ENDED', 'CANCELLED'));
    END IF;

    -- Add FK to guilds if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'giveaways_guild_id_fkey'
        AND conrelid = 'giveaways'::regclass
    ) THEN
      ALTER TABLE giveaways
        ADD CONSTRAINT giveaways_guild_id_fkey
        FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE;
    END IF;

  ELSE
    -- Table doesn't exist — create it fully
    CREATE TABLE giveaways (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      host_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      description TEXT DEFAULT '',
      winner_count INTEGER NOT NULL DEFAULT 1,
      ends_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED', 'CANCELLED')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_giveaways_guild_status ON giveaways(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_giveaways_ends_at ON giveaways(ends_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_giveaways_message ON giveaways(message_id);

-- RLS (idempotent)
ALTER TABLE giveaways ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_giveaways" ON giveaways;
CREATE POLICY "service_role_all_giveaways" ON giveaways
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Trigger (idempotent)
DROP TRIGGER IF EXISTS update_giveaways_updated_at ON giveaways;
CREATE TRIGGER update_giveaways_updated_at BEFORE UPDATE ON giveaways
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. giveaway_entries
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'giveaway_entries' AND relkind = 'r') THEN
    CREATE TABLE giveaway_entries (
      id BIGSERIAL PRIMARY KEY,
      giveaway_id BIGINT NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
      guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(giveaway_id, user_id)
    );
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_entries' AND column_name = 'giveaway_id') THEN
      ALTER TABLE giveaway_entries ADD COLUMN giveaway_id BIGINT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_entries' AND column_name = 'guild_id') THEN
      ALTER TABLE giveaway_entries ADD COLUMN guild_id TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_entries' AND column_name = 'user_id') THEN
      ALTER TABLE giveaway_entries ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_entries' AND column_name = 'joined_at') THEN
      ALTER TABLE giveaway_entries ADD COLUMN joined_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'giveaway_entries_giveaway_id_user_id_key'
        AND conrelid = 'giveaway_entries'::regclass
    ) THEN
      ALTER TABLE giveaway_entries
        ADD CONSTRAINT giveaway_entries_giveaway_id_user_id_key
        UNIQUE (giveaway_id, user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'giveaway_entries_giveaway_id_fkey'
        AND conrelid = 'giveaway_entries'::regclass
    ) THEN
      ALTER TABLE giveaway_entries
        ADD CONSTRAINT giveaway_entries_giveaway_id_fkey
        FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'giveaway_entries_guild_id_fkey'
        AND conrelid = 'giveaway_entries'::regclass
    ) THEN
      ALTER TABLE giveaway_entries
        ADD CONSTRAINT giveaway_entries_guild_id_fkey
        FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_giveaway_entries_guild ON giveaway_entries(guild_id);
CREATE INDEX IF NOT EXISTS idx_giveaway_entries_giveaway ON giveaway_entries(giveaway_id);
CREATE INDEX IF NOT EXISTS idx_giveaway_entries_user ON giveaway_entries(user_id);

ALTER TABLE giveaway_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_giveaway_entries" ON giveaway_entries;
CREATE POLICY "service_role_all_giveaway_entries" ON giveaway_entries
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 3. giveaway_winners
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'giveaway_winners' AND relkind = 'r') THEN
    CREATE TABLE giveaway_winners (
      id BIGSERIAL PRIMARY KEY,
      giveaway_id BIGINT NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
      guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      reroll_number INTEGER NOT NULL DEFAULT 0,
      selected_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(giveaway_id, user_id)
    );
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_winners' AND column_name = 'giveaway_id') THEN
      ALTER TABLE giveaway_winners ADD COLUMN giveaway_id BIGINT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_winners' AND column_name = 'guild_id') THEN
      ALTER TABLE giveaway_winners ADD COLUMN guild_id TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_winners' AND column_name = 'user_id') THEN
      ALTER TABLE giveaway_winners ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_winners' AND column_name = 'reroll_number') THEN
      ALTER TABLE giveaway_winners ADD COLUMN reroll_number INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_winners' AND column_name = 'selected_at') THEN
      ALTER TABLE giveaway_winners ADD COLUMN selected_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'giveaway_winners_giveaway_id_user_id_key'
        AND conrelid = 'giveaway_winners'::regclass
    ) THEN
      ALTER TABLE giveaway_winners
        ADD CONSTRAINT giveaway_winners_giveaway_id_user_id_key
        UNIQUE (giveaway_id, user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'giveaway_winners_giveaway_id_fkey'
        AND conrelid = 'giveaway_winners'::regclass
    ) THEN
      ALTER TABLE giveaway_winners
        ADD CONSTRAINT giveaway_winners_giveaway_id_fkey
        FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'giveaway_winners_guild_id_fkey'
        AND conrelid = 'giveaway_winners'::regclass
    ) THEN
      ALTER TABLE giveaway_winners
        ADD CONSTRAINT giveaway_winners_guild_id_fkey
        FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_giveaway_winners_guild ON giveaway_winners(guild_id);
CREATE INDEX IF NOT EXISTS idx_giveaway_winners_giveaway ON giveaway_winners(giveaway_id);

ALTER TABLE giveaway_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_giveaway_winners" ON giveaway_winners;
CREATE POLICY "service_role_all_giveaway_winners" ON giveaway_winners
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
