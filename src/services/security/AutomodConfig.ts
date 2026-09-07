import { Cache } from '../../utils/cache';
import { GuildAutomodConfigRow } from '../../database/schema';

const DEFAULT_CONFIG: GuildAutomodConfigRow = {
  id: 0,
  guild_id: '',
  enabled: false,
  default_action: 'DELETE',
  bypass_roles: [],
  bypass_channels: [],
  bypass_users: [],
  flood_message_count: 5,
  flood_window_seconds: 5,
  duplicate_message_limit: 3,
  duplicate_window_seconds: 60,
  mention_limit: 5,
  emoji_limit: 10,
  sticker_limit: 5,
  caps_threshold: 0.70,
  caps_min_length: 10,
  banned_words: [],
  blocked_domains: [],
  blocked_invites: true,
  log_channel_id: null,
  created_at: '',
  updated_at: '',
};

const automodConfigCache = new Cache<GuildAutomodConfigRow>(300000);

export const getConfigWithCache = async (
  guildId: string,
  fetcher: (guildId: string) => Promise<GuildAutomodConfigRow | null>
): Promise<GuildAutomodConfigRow> => {
  const cacheKey = `automod:${guildId}`;
  const cached = automodConfigCache.get(cacheKey);
  if (cached) return cached;

  const config = await fetcher(guildId);
  if (config) {
    automodConfigCache.set(cacheKey, config);
    return config;
  }

  automodConfigCache.set(cacheKey, { ...DEFAULT_CONFIG, guild_id: guildId });
  return { ...DEFAULT_CONFIG, guild_id: guildId };
};

export const invalidateAutomodConfig = (guildId: string): void => {
  automodConfigCache.delete(`automod:${guildId}`);
};

export const isBypassed = (
  config: GuildAutomodConfigRow,
  userId: string,
  channelId: string,
  memberRoles: string[]
): boolean => {
  if (config.bypass_users.includes(userId)) return true;
  if (config.bypass_channels.includes(channelId)) return true;
  if (memberRoles.some((role) => config.bypass_roles.includes(role))) return true;
  return false;
};
