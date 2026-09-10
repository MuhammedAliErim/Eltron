ALTER TABLE IF EXISTS guilds ADD COLUMN IF NOT EXISTS leveling_config JSONB DEFAULT '{
  "enabled": true,
  "xpPerMessage": 15,
  "cooldownSeconds": 60,
  "levelUpMessage": "Congratulations {user}! You reached level **{level}**!",
  "levelUpChannel": null,
  "levelUpEmbed": true,
  "xpMultiplier": 1.0,
  "roleRewards": {}
}';

CREATE TABLE IF NOT EXISTS level_role_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  role_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, level)
);

CREATE INDEX IF NOT EXISTS idx_level_role_rewards_guild ON level_role_rewards(guild_id);
