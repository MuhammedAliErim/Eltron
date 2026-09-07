import { Cache } from '../../utils/cache';
import { GuildVerificationConfigRow } from '../../database/schema';

const DEFAULT_CONFIG: GuildVerificationConfigRow = {
  id: 0,
  guild_id: '',
  enabled: false,
  verified_role_id: null,
  unverified_role_id: null,
  verification_timeout_seconds: 300,
  max_attempts: 3,
  rate_limit_window_seconds: 60,
  rate_limit_max_attempts: 5,
  log_channel_id: null,
  created_at: '',
  updated_at: '',
};

const verificationConfigCache = new Cache<GuildVerificationConfigRow>(300000);

export const getVerificationConfigWithCache = async (
  guildId: string,
  fetcher: (guildId: string) => Promise<GuildVerificationConfigRow | null>
): Promise<GuildVerificationConfigRow> => {
  const cacheKey = `verify:${guildId}`;
  const cached = verificationConfigCache.get(cacheKey);
  if (cached) return cached;

  const config = await fetcher(guildId);
  if (config) {
    verificationConfigCache.set(cacheKey, config);
    return config;
  }

  verificationConfigCache.set(cacheKey, { ...DEFAULT_CONFIG, guild_id: guildId });
  return { ...DEFAULT_CONFIG, guild_id: guildId };
};

export const invalidateVerificationConfig = (guildId: string): void => {
  verificationConfigCache.delete(`verify:${guildId}`);
};
