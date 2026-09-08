-- Core dashboard tables: guilds, moderation, automod, security, tickets, applications, staff, welcome, roles, leveling
-- These tables are required by the Dashboard API but were never created via migration.

-- ============================================================
-- GUILTS (base table)
-- ============================================================
CREATE TABLE IF NOT EXISTS guilds (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL DEFAULT '0',
  language TEXT NOT NULL DEFAULT 'tr',
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODERATION
-- ============================================================
CREATE TABLE IF NOT EXISTS moderation_cases (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  type TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  duration BIGINT,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  revoked_by TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guild_id, case_id)
);

CREATE INDEX IF NOT EXISTS idx_moderation_cases_guild ON moderation_cases (guild_id);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_user ON moderation_cases (guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_type ON moderation_cases (guild_id, type);

-- ============================================================
-- AUTOMOD
-- ============================================================
CREATE TABLE IF NOT EXISTS guild_automod_config (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  default_action TEXT NOT NULL DEFAULT 'WARN',
  bypass_roles TEXT[] NOT NULL DEFAULT '{}',
  bypass_channels TEXT[] NOT NULL DEFAULT '{}',
  bypass_users TEXT[] NOT NULL DEFAULT '{}',
  flood_message_count INT NOT NULL DEFAULT 5,
  flood_window_seconds INT NOT NULL DEFAULT 10,
  duplicate_message_limit INT NOT NULL DEFAULT 5,
  duplicate_window_seconds INT NOT NULL DEFAULT 60,
  mention_limit INT NOT NULL DEFAULT 5,
  emoji_limit INT NOT NULL DEFAULT 10,
  sticker_limit INT NOT NULL DEFAULT 5,
  caps_threshold NUMERIC NOT NULL DEFAULT 0.7,
  caps_min_length INT NOT NULL DEFAULT 10,
  banned_words TEXT[] NOT NULL DEFAULT '{}',
  blocked_domains TEXT[] NOT NULL DEFAULT '{}',
  blocked_invites BOOLEAN NOT NULL DEFAULT false,
  log_channel_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automod_rules (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL,
  trigger_value TEXT NOT NULL DEFAULT '',
  action_type TEXT NOT NULL DEFAULT 'WARN',
  action_value TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automod_rules_guild ON automod_rules (guild_id);

-- ============================================================
-- SECURITY: ANTI-RAID
-- ============================================================
CREATE TABLE IF NOT EXISTS guild_anti_raid_config (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  join_rate_limit INT NOT NULL DEFAULT 5,
  join_rate_window_seconds INT NOT NULL DEFAULT 60,
  account_age_threshold_days INT NOT NULL DEFAULT 7,
  burst_threshold INT NOT NULL DEFAULT 10,
  burst_window_seconds INT NOT NULL DEFAULT 300,
  raid_action TEXT NOT NULL DEFAULT 'NONE',
  auto_lockdown BOOLEAN NOT NULL DEFAULT false,
  lockdown_duration_seconds INT NOT NULL DEFAULT 300,
  bypass_roles TEXT[] NOT NULL DEFAULT '{}',
  bypass_users TEXT[] NOT NULL DEFAULT '{}',
  log_channel_id TEXT,
  exempt_roles TEXT[] NOT NULL DEFAULT '{}',
  exempt_users TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SECURITY: QUARANTINE
-- ============================================================
CREATE TABLE IF NOT EXISTS guild_quarantine_config (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  quarantine_role_id TEXT,
  auto_quarantine_on_risk BOOLEAN NOT NULL DEFAULT false,
  auto_quarantine_risk_level TEXT NOT NULL DEFAULT 'HIGH',
  quarantine_duration_seconds INT NOT NULL DEFAULT 3600,
  max_quarantine_duration_seconds INT NOT NULL DEFAULT 86400,
  log_channel_id TEXT,
  bypass_roles TEXT[] NOT NULL DEFAULT '{}',
  bypass_users TEXT[] NOT NULL DEFAULT '{}',
  default_duration INT NOT NULL DEFAULT 3600,
  role_id TEXT,
  auto_release BOOLEAN NOT NULL DEFAULT false,
  release_role_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quarantine_logs (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  performed_by TEXT,
  duration_seconds BIGINT,
  released BOOLEAN NOT NULL DEFAULT false,
  released_by TEXT,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quarantine_logs_guild ON quarantine_logs (guild_id);

-- ============================================================
-- SECURITY: VERIFICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS guild_verification_config (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  verified_role_id TEXT,
  unverified_role_id TEXT,
  verification_timeout_seconds INT NOT NULL DEFAULT 300,
  max_attempts INT NOT NULL DEFAULT 3,
  rate_limit_window_seconds INT NOT NULL DEFAULT 60,
  rate_limit_max_attempts INT NOT NULL DEFAULT 5,
  log_channel_id TEXT,
  method TEXT NOT NULL DEFAULT 'BUTTON',
  role_id TEXT,
  welcome_message TEXT,
  verification_channel_id TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  timeout_minutes INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  method TEXT NOT NULL DEFAULT 'button',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guild_id, user_id)
);

-- ============================================================
-- SECURITY: CHANNEL WARNING
-- ============================================================
CREATE TABLE IF NOT EXISTS guild_channel_warning_config (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  auto_warning_on_spam BOOLEAN NOT NULL DEFAULT false,
  slowmode_escalation_steps INT[] NOT NULL DEFAULT '{5,10,30,60}',
  violation_threshold INT NOT NULL DEFAULT 3,
  escalation_window_seconds INT NOT NULL DEFAULT 300,
  deescalation_delay_seconds INT NOT NULL DEFAULT 3600,
  max_slowmode_seconds INT NOT NULL DEFAULT 21600,
  bypass_roles TEXT[] NOT NULL DEFAULT '{}',
  bypass_users TEXT[] NOT NULL DEFAULT '{}',
  log_channel_id TEXT,
  max_slowmode INT NOT NULL DEFAULT 21600,
  slowmode_increment INT NOT NULL DEFAULT 5,
  alert_threshold INT NOT NULL DEFAULT 3,
  exempt_roles TEXT[] NOT NULL DEFAULT '{}',
  exempt_channels TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_warning_logs (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_slowmode BIGINT,
  new_slowmode BIGINT,
  reason TEXT,
  performed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channel_warning_logs_guild ON channel_warning_logs (guild_id);

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL DEFAULT '',
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets (guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (guild_id, status);

-- ============================================================
-- APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  applicant_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'STAFF',
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_answers (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_guild ON applications (guild_id);

-- ============================================================
-- STAFF
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_members (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  staff_role TEXT NOT NULL DEFAULT 'STAFF',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  added_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_guild ON staff_members (guild_id);

-- ============================================================
-- WELCOME / GOODBYE
-- ============================================================
CREATE TABLE IF NOT EXISTS welcome_config (
  guild_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  channel_id TEXT,
  welcome_message TEXT NOT NULL DEFAULT 'Welcome to the server!',
  dm_message TEXT,
  auto_role_id TEXT,
  embed_enabled BOOLEAN NOT NULL DEFAULT false,
  embed_color TEXT NOT NULL DEFAULT '#5865F2',
  embed_title TEXT NOT NULL DEFAULT 'Welcome!',
  embed_description TEXT NOT NULL DEFAULT '',
  embed_thumbnail BOOLEAN NOT NULL DEFAULT false,
  goodbye_enabled BOOLEAN NOT NULL DEFAULT false,
  goodbye_channel_id TEXT,
  goodbye_message TEXT NOT NULL DEFAULT 'Goodbye!',
  goodbye_embed_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROLES / AUTOROLE
-- ============================================================
CREATE TABLE IF NOT EXISTS autorole_config (
  guild_id TEXT PRIMARY KEY,
  role_id TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- LEVELING / XP
-- ============================================================
CREATE TABLE IF NOT EXISTS user_xp (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  xp BIGINT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 0,
  total_messages BIGINT NOT NULL DEFAULT 0,
  last_xp_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_xp_guild ON user_xp (guild_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_leaderboard ON user_xp (guild_id, xp DESC);
