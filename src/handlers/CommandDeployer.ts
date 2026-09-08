import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { logger, logError } from '../utils/logger';
import { env } from '../config/env';
import { EltronClient } from '../structures/EltronClient';

const sanitize = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (obj === env.DISCORD_TOKEN) return '[REDACTED]';
    if (obj === env.SUPABASE_SERVICE_ROLE_KEY) return '[REDACTED]';
    if (obj === env.SESSION_SECRET) return '[REDACTED]';
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = sanitize(v);
    }
    return out;
  }
  return obj;
};

const logCommandJson = (index: number, name: string, json: Record<string, unknown>) => {
  const keys = Object.keys(json);
  const optionCount = Array.isArray(json.options) ? json.options.length : 0;
  logger.info(
    { index, name, keys, optionCount, json: sanitize(json) },
    `[CMD-DUMP] #${index} "${name}"`,
  );
};

export const deployCommands = async (client: EltronClient): Promise<void> => {
  try {
    const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

    const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
    const commandNames: string[] = [];

    for (const [name, command] of client.commands) {
      try {
        const json = command.data.toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody;
        commands.push(json);
        commandNames.push(name);
      } catch (err) {
        logError(`Failed to serialize command "${name}"`, err);
      }
    }

    logger.info(`=== PRE-DEPLOY: ${commands.length} commands ready ===`);

    for (let i = 0; i < commands.length; i++) {
      logCommandJson(i, commandNames[i], commands[i] as unknown as Record<string, unknown>);
    }

    logger.info(`=== Sending PUT /applications/${env.DISCORD_CLIENT_ID}/commands ===`);
    logger.info(`Request body size: ${JSON.stringify(commands).length} bytes`);

    const data = (await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
      body: commands,
    })) as unknown[];

    logger.info(`=== DEPLOY SUCCESS: ${data.length} commands deployed ===`);
  } catch (error: any) {
    logger.error('=== DEPLOY FAILED — dumping full error context ===');

    if (error instanceof Error) {
      logger.error({ name: error.name, message: error.message, stack: error.stack }, 'Error object (native)');
    }

    if (error?.code !== undefined) logger.error({ code: error.code }, 'error.code');
    if (error?.status !== undefined) logger.error({ status: error.status }, 'error.status');
    if (error?.statusText !== undefined) logger.error({ statusText: error.statusText }, 'error.statusText');
    if (error?.url !== undefined) logger.error({ url: error.url }, 'error.url');

    if (error?.message) {
      logger.error({ message: error.message }, 'error.message');
    }

    if (error?.rawError !== undefined) {
      const raw = error.rawError;
      logger.error({ rawError: sanitize(raw) }, 'error.rawError (full)');

      if (raw?.code !== undefined) logger.error({ code: raw.code }, 'rawError.code');
      if (raw?.message) logger.error({ message: raw.message }, 'rawError.message');
      if (raw?.errors !== undefined) {
        logger.error({ errors: sanitize(raw.errors) }, 'rawError.errors (full object)');
      }
    }

    if (error?.body !== undefined) {
      const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
      logger.error({ body: sanitize(body) }, 'error.body (request body sent to Discord)');
    }

    if (error?.requestBody !== undefined) {
      logger.error({ requestBody: sanitize(error.requestBody) }, 'error.requestBody');
    }

    if (error?.headers) {
      logger.error({ headers: error.headers }, 'error.headers');
    }

    if (error?.rawError?.errors && typeof error.rawError.errors === 'object') {
      logger.error('=== Attempting per-command isolation from error paths ===');
      const errObj = error.rawError.errors;
      const pathKeys = Object.keys(errObj);
      for (const pk of pathKeys) {
        logger.error({ path: pk, detail: sanitize(errObj[pk]) }, `Error at path "${pk}"`);
      }
    }

    logError('Failed to deploy commands (final)', error);
  }
};
