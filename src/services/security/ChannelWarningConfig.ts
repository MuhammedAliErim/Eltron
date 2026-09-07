import { Cache } from '../../utils/cache';
import { GuildChannelWarningConfigRow } from '../../database/schema';

const DEFAULT_CONFIG: GuildChannelWarningConfigRow = {
  id: 0,
  guild_id: '',
  enabled: false,
  auto_warning_on_spam: true,
  slowmode_escalation_steps: [5, 15, 30, 60, 120],
  violation_threshold: 3,
  escalation_window_seconds: 300,
  deescalation_delay_seconds: 600,
  max_slowmode_seconds: 120,
  bypass_roles: [],
  bypass_users: [],
  log_channel_id: null,
  created_at: '',
  updated_at: '',
};

const channelWarningConfigCache = new Cache<GuildChannelWarningConfigRow>(300000);

export const getChannelWarningConfigWithCache = async (
  guildId: string,
  fetcher: (guildId: string) => Promise<GuildChannelWarningConfigRow | null>
): Promise<GuildChannelWarningConfigRow> => {
  const cacheKey = `chwarn:${guildId}`;
  const cached = channelWarningConfigCache.get(cacheKey);
  if (cached) return cached;

  const config = await fetcher(guildId);
  if (config) {
    channelWarningConfigCache.set(cacheKey, config);
    return config;
  }

  channelWarningConfigCache.set(cacheKey, { ...DEFAULT_CONFIG, guild_id: guildId });
  return { ...DEFAULT_CONFIG, guild_id: guildId };
};

export const invalidateChannelWarningConfig = (guildId: string): void => {
  channelWarningConfigCache.delete(`chwarn:${guildId}`);
};
