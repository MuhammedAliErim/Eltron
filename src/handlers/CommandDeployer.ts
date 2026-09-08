import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { logger, logError } from '../utils/logger';
import { env } from '../config/env';
import { EltronClient } from '../structures/EltronClient';

const sanitize = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (obj === env.DISCORD_TOKEN || obj === env.SUPABASE_SERVICE_ROLE_KEY || obj === env.SESSION_SECRET) return '[REDACTED]';
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) out[k] = sanitize(v);
    return out;
  }
  return obj;
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
        logError(`Serialize failed: "${name}"`, err);
      }
    }

    logger.info(`=== DEPLOY START: ${commands.length} commands ===`);
    for (let i = 0; i < commands.length; i++) {
      const c = commands[i] as any;
      const keys = Object.keys(c).filter(k => k !== 'options');
      const optCount = Array.isArray(c.options) ? c.options.length : 0;
      logger.info(`  #${i} ${commandNames[i]} keys=[${keys.join(',')}] options=${optCount}`);
    }

    const bodySize = JSON.stringify(commands).length;
    logger.info(`=== PUT /applications/${env.DISCORD_CLIENT_ID}/commands (${bodySize} bytes) ===`);

    const data = (await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
      body: commands,
    })) as unknown[];

    logger.info(`=== DEPLOY OK: ${data.length} commands ===`);
  } catch (error: any) {
    const code = error?.rawError?.code ?? error?.code;
    const status = error?.status;
    const msg = error?.rawError?.message ?? error?.message;
    logger.error(`=== DEPLOY FAILED code=${code} status=${status} msg=${msg} ===`);

    if (error?.rawError?.errors) {
      const errs = error.rawError.errors;
      const paths = Object.keys(errs);
      for (const p of paths) {
        const detail = errs[p];
        const idx = parseInt(p.split('.')[0], 10);
        const cmdName = !isNaN(idx) && idx < commandNames.length ? commandNames[idx] : '?';
        logger.error(`  PATH ${p} -> command #${idx} "${cmdName}"`);
        logger.error(`  DETAIL: ${JSON.stringify(sanitize(detail))}`);
      }
    }

    logError('deploy-commands', error);
  }
};
