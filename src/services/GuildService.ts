import { GuildRepository } from '../database/repositories/GuildRepository';
import { GuildRow } from '../database/schema';
import { Guild } from 'discord.js';
import { logError } from '../utils/logger';
import { GuildNotFoundError, PermissionError } from '../utils/errors';
import { ValidationGuard } from '../middleware/ValidationGuard';
import { guildIdSchema, languageSchema } from '../utils/validation';
import { guildCache, GuildCacheData } from '../utils/cache';

export class GuildService {
  private repository: GuildRepository;

  constructor() {
    this.repository = new GuildRepository();
  }

  async ensureGuild(discordGuild: Guild): Promise<GuildRow> {
    try {
      const cached = guildCache.get(`guild:${discordGuild.id}`);
      if (cached) {
        return cached as unknown as GuildRow;
      }

      const guild = await this.repository.getOrCreateGuild(
        discordGuild.id,
        discordGuild.name,
        discordGuild.ownerId
      );

      const cacheData: GuildCacheData = {
        guildId: guild.guild_id,
        name: guild.name,
        ownerId: guild.owner_id,
        language: guild.language,
        timezone: guild.timezone,
        settings: guild.settings,
      };
      guildCache.set(`guild:${discordGuild.id}`, cacheData);

      return guild;
    } catch (error) {
      logError(`Failed to ensure guild ${discordGuild.id} in database`, error);
      throw error;
    }
  }

  async getGuild(guildId: string): Promise<GuildRow | null> {
    ValidationGuard.validate(guildIdSchema, guildId);

    const cached = guildCache.get(`guild:${guildId}`);
    if (cached) {
      return cached as unknown as GuildRow;
    }

    const guild = await this.repository.getGuild(guildId);
    if (guild) {
      const cacheData: GuildCacheData = {
        guildId: guild.guild_id,
        name: guild.name,
        ownerId: guild.owner_id,
        language: guild.language,
        timezone: guild.timezone,
        settings: guild.settings,
      };
      guildCache.set(`guild:${guildId}`, cacheData);
    }
    return guild;
  }

  async setLanguage(
    guildId: string,
    language: string,
    requesterId: string
  ): Promise<GuildRow | null> {
    ValidationGuard.validate(guildIdSchema, guildId);
    ValidationGuard.validate(languageSchema, language);

    const guild = await this.repository.getGuild(guildId);
    if (!guild) {
      throw new GuildNotFoundError(guildId);
    }

    if (guild.owner_id !== requesterId) {
      throw new PermissionError('Only the guild owner can change the language.');
    }

    const updated = await this.repository.updateSettings(guildId, { language });

    if (updated) {
      const cacheData: GuildCacheData = {
        guildId: updated.guild_id,
        name: updated.name,
        ownerId: updated.owner_id,
        language: updated.language,
        timezone: updated.timezone,
        settings: updated.settings,
      };
      guildCache.set(`guild:${guildId}`, cacheData);
    }

    return updated;
  }

  invalidateCache(guildId: string): void {
    guildCache.delete(`guild:${guildId}`);
  }
}

export const guildService = new GuildService();
