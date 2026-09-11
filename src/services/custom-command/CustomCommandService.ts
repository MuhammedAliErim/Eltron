import { Message } from 'discord.js';
import { CustomCommandRepository, CustomCommandRow } from '../../database/repositories/CustomCommandRepository';
import { Cache } from '../../utils/cache';
import { logger } from '../../utils/logger';
import { BusinessRuleError } from '../../utils/errors';

const repo = new CustomCommandRepository();
const commandsCache = new Cache<CustomCommandRow[]>(60000);
const cooldownCache = new Cache<Record<string, number>>(60000);

export interface ProcessedCommand {
  response: string;
  dmResponse: boolean;
  embedColor: string | null;
}

async function getEnabledCommands(guildId: string): Promise<CustomCommandRow[]> {
  const cached = commandsCache.get(guildId);
  if (cached) return cached;

  try {
    const commands = await repo.getEnabledByGuild(guildId);
    commandsCache.set(guildId, commands);
    return commands;
  } catch (error) {
    logger.error({ err: error, guildId }, 'Failed to fetch enabled custom commands');
    return [];
  }
}

function findCommand(commands: CustomCommandRow[], name: string): CustomCommandRow | null {
  const lowerName = name.toLowerCase();
  const found = commands.find(
    (c) => c.name === lowerName || c.aliases.includes(lowerName)
  );
  return found || null;
}

function checkCooldown(command: CustomCommandRow, userId: string): boolean {
  if (command.cooldown_seconds <= 0) return true;

  const key = `${command.id}:${userId}`;
  const cooldowns = cooldownCache.get(command.guild_id) || {};
  const lastUsed = cooldowns[key];

  if (lastUsed) {
    const elapsed = (Date.now() - lastUsed) / 1000;
    if (elapsed < command.cooldown_seconds) {
      return false;
    }
  }

  cooldowns[key] = Date.now();
  cooldownCache.set(command.guild_id, cooldowns);
  return true;
}

function checkPermission(command: CustomCommandRow, message: Message): boolean {
  if (!command.requires_permission) return true;
  return message.member?.permissions.has(command.requires_permission as any) ?? false;
}

function processVariables(response: string, message: Message, args: string[]): string {
  const { member, guild, channel } = message;
  const now = new Date();

  let processed = response;

  processed = processed.replace(/\{user\}/g, `<@${message.author.id}>`);
  processed = processed.replace(/\{username\}/g, message.author.displayName);
  processed = processed.replace(/\{server\}/g, guild?.name || 'Unknown Server');
  processed = processed.replace(/\{channel\}/g, `<#${message.channel.id}>`);
  processed = processed.replace(/\{date\}/g, now.toLocaleDateString());
  processed = processed.replace(/\{time\}/g, now.toLocaleTimeString());
  processed = processed.replace(/\{args\}/g, args.join(' '));

  for (let i = 0; i < args.length; i++) {
    processed = processed.replace(new RegExp(`\\{arg${i + 1}\\}`, 'g'), args[i]);
  }

  processed = processed.replace(/\{random:(\d+):(\d+)\}/g, (_match, minStr, maxStr) => {
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    if (isNaN(min) || isNaN(max) || min > max) return '0';
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  });

  if (guild) {
    processed = processed.replace(/\{rolecount\}/g, String(guild.memberCount));
    processed = processed.replace(/\{online\}/g, String(guild.members.cache.filter((m) => m.presence?.status !== 'offline').size));
  }

  return processed;
}

export function invalidateGuildCache(guildId: string): void {
  commandsCache.delete(guildId);
}

export async function processCommand(
  message: Message,
  args: string[]
): Promise<ProcessedCommand | null> {
  if (!message.guild) return null;

  const guildId = message.guild.id;
  const commands = await getEnabledCommands(guildId);

  if (commands.length === 0) return null;

  const commandName = args[0] || '';
  const command = findCommand(commands, commandName);

  if (!command) return null;

  if (!checkCooldown(command, message.author.id)) {
    throw new BusinessRuleError(`This command is on cooldown. Please wait ${command.cooldown_seconds} seconds.`);
  }

  if (!checkPermission(command, message)) {
    throw new BusinessRuleError(`You need the \`${command.requires_permission}\` permission to use this command.`);
  }

  await repo.incrementUses(command.id).catch(() => {});

  const commandArgs = args.slice(1);
  const processedResponse = processVariables(command.response, message, commandArgs);

  return {
    response: processedResponse,
    dmResponse: command.dm_response,
    embedColor: command.embed_color,
  };
}

export async function getCustomCommandByName(
  guildId: string,
  name: string
): Promise<CustomCommandRow | null> {
  return repo.getByName(guildId, name);
}

export async function getAllCustomCommands(guildId: string): Promise<CustomCommandRow[]> {
  return repo.getByGuild(guildId);
}

export async function createCustomCommand(
  guildId: string,
  name: string,
  response: string,
  options: {
    description?: string;
    aliases?: string[];
    cooldown_seconds?: number;
    requires_permission?: string;
    embed_color?: string;
    dm_response?: boolean;
    created_by: string;
  }
): Promise<CustomCommandRow> {
  const existing = await repo.getByName(guildId, name);
  if (existing) {
    throw new BusinessRuleError(`A custom command with the name \`${name}\` already exists`);
  }

  const created = await repo.create({
    guild_id: guildId,
    name,
    response,
    description: options.description,
    aliases: options.aliases,
    cooldown_seconds: options.cooldown_seconds,
    requires_permission: options.requires_permission,
    embed_color: options.embed_color,
    dm_response: options.dm_response,
    created_by: options.created_by,
  });

  invalidateGuildCache(guildId);
  return created;
}

export async function updateCustomCommand(
  guildId: string,
  name: string,
  updates: {
    response?: string;
    description?: string;
    enabled?: boolean;
    aliases?: string[];
    embed_color?: string | null;
    requires_permission?: string | null;
    cooldown_seconds?: number;
    dm_response?: boolean;
  }
): Promise<CustomCommandRow> {
  const command = await repo.getByName(guildId, name);
  if (!command) {
    throw new BusinessRuleError(`Custom command \`${name}\` not found`);
  }

  const updated = await repo.update(command.id, updates);
  if (!updated) {
    throw new BusinessRuleError('Failed to update custom command');
  }

  invalidateGuildCache(guildId);
  return updated;
}

export async function deleteCustomCommand(
  guildId: string,
  name: string
): Promise<boolean> {
  const command = await repo.getByName(guildId, name);
  if (!command) {
    throw new BusinessRuleError(`Custom command \`${name}\` not found`);
  }

  const result = await repo.delete(command.id);
  invalidateGuildCache(guildId);
  return result;
}

export async function getCustomCommandsPaginated(
  guildId: string,
  page: number,
  limit: number
): Promise<{ commands: CustomCommandRow[]; total: number }> {
  const allCommands = await repo.getByGuild(guildId);
  const total = allCommands.length;
  const offset = (page - 1) * limit;
  const commands = allCommands.slice(offset, offset + limit);

  return { commands, total };
}
