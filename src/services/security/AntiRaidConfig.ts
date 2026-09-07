import { Cache } from '../../utils/cache';
import { GuildAntiRaidConfigRow } from '../../database/schema';

const DEFAULT_CONFIG: GuildAntiRaidConfigRow = {
  id: 0,
  guild_id: '',
  enabled: false,
  join_rate_limit: 10,
  join_rate_window_seconds: 10,
  account_age_threshold_days: 7,
  burst_threshold: 5,
  burst_window_seconds: 3,
  raid_action: 'KICK',
  auto_lockdown: false,
  lockdown_duration_seconds: 300,
  bypass_roles: [],
  bypass_users: [],
  log_channel_id: null,
  created_at: '',
  updated_at: '',
};

const antiRaidConfigCache = new Cache<GuildAntiRaidConfigRow>(300000);

export const getAntiRaidConfigWithCache = async (
  guildId: string,
  fetcher: (guildId: string) => Promise<GuildAntiRaidConfigRow | null>
): Promise<GuildAntiRaidConfigRow> => {
  const cacheKey = `antiraid:${guildId}`;
  const cached = antiRaidConfigCache.get(cacheKey);
  if (cached) return cached;

  const config = await fetcher(guildId);
  if (config) {
    antiRaidConfigCache.set(cacheKey, config);
    return config;
  }

  antiRaidConfigCache.set(cacheKey, { ...DEFAULT_CONFIG, guild_id: guildId });
  return { ...DEFAULT_CONFIG, guild_id: guildId };
};

export const invalidateAntiRaidConfig = (guildId: string): void => {
  antiRaidConfigCache.delete(`antiraid:${guildId}`);
};

export const isAntiRaidBypassed = (
  config: GuildAntiRaidConfigRow,
  userId: string,
  memberRoles: string[]
): boolean => {
  if (config.bypass_users.includes(userId)) return true;
  if (memberRoles.some((role) => config.bypass_roles.includes(role))) return true;
  return false;
};
