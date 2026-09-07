import { Cache } from '../../utils/cache';
import { GuildQuarantineConfigRow } from '../../database/schema';

const DEFAULT_CONFIG: GuildQuarantineConfigRow = {
  id: 0,
  guild_id: '',
  enabled: false,
  quarantine_role_id: null,
  auto_quarantine_on_risk: true,
  auto_quarantine_risk_level: 'HIGH',
  quarantine_duration_seconds: 3600,
  max_quarantine_duration_seconds: 86400,
  log_channel_id: null,
  bypass_roles: [],
  bypass_users: [],
  created_at: '',
  updated_at: '',
};

const quarantineConfigCache = new Cache<GuildQuarantineConfigRow>(300000);

export const getQuarantineConfigWithCache = async (
  guildId: string,
  fetcher: (guildId: string) => Promise<GuildQuarantineConfigRow | null>
): Promise<GuildQuarantineConfigRow> => {
  const cacheKey = `quarantine:${guildId}`;
  const cached = quarantineConfigCache.get(cacheKey);
  if (cached) return cached;

  const config = await fetcher(guildId);
  if (config) {
    quarantineConfigCache.set(cacheKey, config);
    return config;
  }

  quarantineConfigCache.set(cacheKey, { ...DEFAULT_CONFIG, guild_id: guildId });
  return { ...DEFAULT_CONFIG, guild_id: guildId };
};

export const invalidateQuarantineConfig = (guildId: string): void => {
  quarantineConfigCache.delete(`quarantine:${guildId}`);
};
