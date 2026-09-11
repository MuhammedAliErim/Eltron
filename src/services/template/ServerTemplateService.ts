import { GuildRepository } from '../../database/repositories/GuildRepository';
import { AutomodRepository } from '../../database/repositories/AutomodRepository';
import { WelcomeRepository } from '../../database/repositories/WelcomeRepository';
import { RoleRepository } from '../../database/repositories/RoleRepository';
import { LevelConfigRepository } from '../../database/repositories/LevelConfigRepository';
import { ReactionRoleRepository } from '../../database/repositories/ReactionRoleRepository';
import { AutoResponseRepository } from '../../database/repositories/AutoResponseRepository';
import { TagRepository } from '../../database/repositories/TagRepository';
import { CustomCommandRepository } from '../../database/repositories/CustomCommandRepository';
import { logError } from '../../utils/logger';

const guildRepo = new GuildRepository();
const automodRepo = new AutomodRepository();
const welcomeRepo = new WelcomeRepository();
const roleRepo = new RoleRepository();
const levelConfigRepo = new LevelConfigRepository();
const reactionRoleRepo = new ReactionRoleRepository();
const autoResponseRepo = new AutoResponseRepository();
const tagRepo = new TagRepository();
const customCommandRepo = new CustomCommandRepository();

export interface ServerTemplate {
  version: string;
  exportedAt: string;
  sections: Record<string, unknown>;
}

export interface ImportResult {
  section: string;
  success: boolean;
  error?: string;
}

function sanitizeRow(row: Record<string, unknown>, removeKeys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (removeKeys.includes(key)) continue;
    if (key === 'guild_id' || key === 'id') continue;
    if (key === 'created_at' || key === 'updated_at') continue;
    result[key] = value;
  }
  return result;
}

function cloneWithoutCircular(value: unknown, seen = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (seen.has(value as object)) return undefined;
  seen.add(value as object);
  if (Array.isArray(value)) return value.map((item) => cloneWithoutCircular(item, seen));
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = cloneWithoutCircular(val, seen);
  }
  return result;
}

export async function exportConfig(guildId: string): Promise<ServerTemplate> {
  const sections: Record<string, unknown> = {};

  const trySection = async (name: string, fetcher: () => Promise<unknown>): Promise<void> => {
    try {
      const data = await fetcher();
      if (data !== null && data !== undefined) {
        sections[name] = cloneWithoutCircular(data);
      }
    } catch (error) {
      logError(`Template export failed for section: ${name}`, error);
    }
  };

  await trySection('guild', async () => {
    const guild = await guildRepo.get(guildId);
    if (!guild) return null;
    return sanitizeRow(guild as unknown as Record<string, unknown>, ['guild_id', 'id', 'created_at', 'updated_at']);
  });

  await trySection('automod', async () => {
    const config = await automodRepo.getConfig(guildId);
    if (!config) return null;
    return sanitizeRow(config as unknown as Record<string, unknown>, ['guild_id', 'id']);
  });

  await trySection('welcome', async () => {
    const config = await welcomeRepo.getConfig(guildId);
    return sanitizeRow(config as unknown as Record<string, unknown>, ['guild_id']);
  });

  await trySection('autorole', async () => {
    const config = await roleRepo.getAutoRoleConfig(guildId);
    return sanitizeRow(config as unknown as Record<string, unknown>, ['guild_id']);
  });

  await trySection('leveling', async () => {
    const config = await levelConfigRepo.getConfig(guildId);
    return config;
  });

  await trySection('reaction_roles', async () => {
    const roles = await reactionRoleRepo.getByGuild(guildId);
    return roles.map((r) => sanitizeRow(r as unknown as Record<string, unknown>, ['guild_id', 'id', 'channel_id', 'message_id', 'created_by']));
  });

  await trySection('auto_responses', async () => {
    const responses = await autoResponseRepo.getByGuild(guildId);
    return responses.map((r) => sanitizeRow(r as unknown as Record<string, unknown>, ['guild_id', 'id', 'created_by']));
  });

  await trySection('tags', async () => {
    const tags = await tagRepo.getByGuild(guildId);
    return tags.map((t) => sanitizeRow(t as unknown as Record<string, unknown>, ['guild_id', 'id', 'created_by']));
  });

  await trySection('custom_commands', async () => {
    const commands = await customCommandRepo.getByGuild(guildId);
    return commands.map((c) => sanitizeRow(c as unknown as Record<string, unknown>, ['guild_id', 'id', 'created_by']));
  });

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    sections,
  };
}

export async function importConfig(guildId: string, config: ServerTemplate): Promise<ImportResult[]> {
  const results: ImportResult[] = [];

  if (!config || typeof config !== 'object') {
    return [{ section: 'all', success: false, error: 'Invalid config format' }];
  }

  if (!config.sections || typeof config.sections !== 'object') {
    return [{ section: 'all', success: false, error: 'Invalid config: missing sections' }];
  }

  const { sections } = config;

  const tryImport = async (name: string, importer: () => Promise<void>): Promise<void> => {
    try {
      await importer();
      results.push({ section: name, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logError(`Template import failed for section: ${name}`, error);
      results.push({ section: name, success: false, error: message });
    }
  };

  if (sections.guild && typeof sections.guild === 'object') {
    await tryImport('guild', async () => {
      const data = sections.guild as Record<string, unknown>;
      await guildRepo.getOrCreateGuild(guildId, String(data.name || ''), String(data.owner_id || ''));
      const updatePayload: Record<string, unknown> = {};
      if (data.language) updatePayload.language = data.language;
      if (data.timezone) updatePayload.timezone = data.timezone;
      if (data.settings) updatePayload.settings = data.settings;
      if (Object.keys(updatePayload).length > 0) {
        await guildRepo.updateSettings(guildId, updatePayload as { language?: string; timezone?: string; settings?: Record<string, unknown> });
      }
    });
  }

  if (sections.automod && typeof sections.automod === 'object') {
    await tryImport('automod', async () => {
      const data = sections.automod as Record<string, unknown>;
      await automodRepo.getOrCreateConfig(guildId);
      const updatePayload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) updatePayload[key] = value;
      }
      if (Object.keys(updatePayload).length > 0) {
        await automodRepo.updateConfig(guildId, updatePayload);
      }
    });
  }

  if (sections.welcome && typeof sections.welcome === 'object') {
    await tryImport('welcome', async () => {
      const data = sections.welcome as Record<string, unknown>;
      await welcomeRepo.upsertConfig(guildId, data);
    });
  }

  if (sections.autorole && typeof sections.autorole === 'object') {
    await tryImport('autorole', async () => {
      const data = sections.autorole as Record<string, unknown>;
      const updatePayload: Record<string, unknown> = {};
      if ('enabled' in data) updatePayload.enabled = data.enabled;
      if ('role_id' in data) updatePayload.role_id = data.role_id;
      if (Object.keys(updatePayload).length > 0) {
        await roleRepo.upsertAutoRoleConfig(guildId, updatePayload);
      }
    });
  }

  if (sections.leveling && typeof sections.leveling === 'object') {
    await tryImport('leveling', async () => {
      const data = sections.leveling as Record<string, unknown>;
      await levelConfigRepo.updateConfig(guildId, data);
    });
  }

  if (sections.reaction_roles && Array.isArray(sections.reaction_roles)) {
    await tryImport('reaction_roles', async () => {
      for (const item of sections.reaction_roles as Record<string, unknown>[]) {
        try {
          if (item.emoji && item.role_id && item.title) {
            await reactionRoleRepo.create({
              guild_id: guildId,
              channel_id: '0',
              message_id: '0',
              title: String(item.title),
              description: item.description ? String(item.description) : undefined,
              color: item.color ? String(item.color) : undefined,
              emoji: String(item.emoji),
              role_id: String(item.role_id),
              created_by: '0',
            });
          }
        } catch {
          continue;
        }
      }
    });
  }

  if (sections.auto_responses && Array.isArray(sections.auto_responses)) {
    await tryImport('auto_responses', async () => {
      for (const item of sections.auto_responses as Record<string, unknown>[]) {
        try {
          if (item.trigger_text && item.response_text) {
            await autoResponseRepo.create({
              guild_id: guildId,
              trigger_text: String(item.trigger_text),
              response_text: String(item.response_text),
              match_type: String(item.match_type || 'exact'),
              channel_ids: Array.isArray(item.channel_ids) ? item.channel_ids as string[] : undefined,
              excluded_channel_ids: Array.isArray(item.excluded_channel_ids) ? item.excluded_channel_ids as string[] : undefined,
              cooldown_seconds: typeof item.cooldown_seconds === 'number' ? item.cooldown_seconds : undefined,
              created_by: '0',
            });
          }
        } catch {
          continue;
        }
      }
    });
  }

  if (sections.tags && Array.isArray(sections.tags)) {
    await tryImport('tags', async () => {
      for (const item of sections.tags as Record<string, unknown>[]) {
        try {
          if (item.name && item.content) {
            await tagRepo.create({
              guild_id: guildId,
              name: String(item.name),
              content: String(item.content),
              aliases: Array.isArray(item.aliases) ? item.aliases as string[] : undefined,
              created_by: '0',
            });
          }
        } catch {
          continue;
        }
      }
    });
  }

  if (sections.custom_commands && Array.isArray(sections.custom_commands)) {
    await tryImport('custom_commands', async () => {
      for (const item of sections.custom_commands as Record<string, unknown>[]) {
        try {
          if (item.name && item.response) {
            await customCommandRepo.create({
              guild_id: guildId,
              name: String(item.name),
              response: String(item.response),
              description: item.description ? String(item.description) : undefined,
              aliases: Array.isArray(item.aliases) ? item.aliases as string[] : undefined,
              cooldown_seconds: typeof item.cooldown_seconds === 'number' ? item.cooldown_seconds : undefined,
              requires_permission: item.requires_permission ? String(item.requires_permission) : undefined,
              embed_color: item.embed_color ? String(item.embed_color) : undefined,
              dm_response: typeof item.dm_response === 'boolean' ? item.dm_response : undefined,
              created_by: '0',
            });
          }
        } catch {
          continue;
        }
      }
    });
  }

  return results;
}

export function getConfigTemplate(): ServerTemplate {
  return {
    version: '1.0',
    exportedAt: '',
    sections: {
      guild: {
        name: '',
        language: 'en',
        timezone: 'UTC',
        settings: {},
      },
      automod: {
        enabled: false,
        default_action: 'WARN',
        bypass_roles: [],
        bypass_channels: [],
        bypass_users: [],
        flood_message_count: 5,
        flood_window_seconds: 10,
        duplicate_message_limit: 3,
        duplicate_window_seconds: 30,
        mention_limit: 5,
        emoji_limit: 10,
        sticker_limit: 10,
        caps_threshold: 0.7,
        caps_min_length: 10,
        banned_words: [],
        blocked_domains: [],
        blocked_invites: false,
        log_channel_id: null,
      },
      welcome: {
        welcome_enabled: false,
        welcome_channel_id: null,
        welcome_message: 'Welcome to {server}, {user}!',
        welcome_use_embed: false,
        welcome_embed_title: 'Welcome!',
        welcome_embed_description: 'Welcome to {server}, {user}!',
        welcome_embed_color: '#00FF00',
        goodbye_enabled: false,
        goodbye_channel_id: null,
        goodbye_message: 'Goodbye {user}, we will miss you!',
        goodbye_use_embed: false,
        goodbye_embed_title: 'Goodbye!',
        goodbye_embed_description: 'Goodbye {user}, we will miss you!',
        goodbye_embed_color: '#FF0000',
      },
      autorole: {
        enabled: false,
        role_id: null,
      },
      leveling: {
        enabled: true,
        xpPerMessage: 15,
        cooldownSeconds: 60,
        levelUpMessage: 'Congratulations {user}! You reached level **{level}**!',
        levelUpChannel: null,
        levelUpEmbed: true,
        xpMultiplier: 1.0,
        roleRewards: {},
      },
      reaction_roles: [],
      auto_responses: [
        {
          trigger_text: 'example trigger',
          response_text: 'example response',
          match_type: 'exact',
          channel_ids: [],
          excluded_channel_ids: [],
          cooldown_seconds: 0,
        },
      ],
      tags: [
        {
          name: 'example-tag',
          content: 'This is an example tag',
          aliases: [],
        },
      ],
      custom_commands: [
        {
          name: 'example-command',
          response: 'This is an example custom command',
          description: 'Example description',
          aliases: [],
          cooldown_seconds: 0,
          requires_permission: null,
          embed_color: null,
          dm_response: false,
        },
      ],
    },
  };
}
