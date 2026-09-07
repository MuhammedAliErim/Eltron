import fs from 'fs';
import path from 'path';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { Command } from './Command';
import { Event } from './Event';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class EltronClient extends Client {
  public commands: Collection<string, Command> = new Collection();
  public events: Collection<string, Event<keyof import('discord.js').ClientEvents>> = new Collection();
  public cooldowns: Collection<string, Collection<string, number>> = new Collection();
  private cooldownTimers: Collection<string, ReturnType<typeof setTimeout>> = new Collection();
  public startTime: number = Date.now();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });

    this.on('error', (error) => {
      logger.error({ err: error }, 'Discord gateway error');
    });

    this.on('warn', (warning) => {
      logger.warn({ warning }, 'Discord gateway warning');
    });

    this.on('disconnect', () => {
      logger.warn('Discord gateway disconnected');
    });

    this.on('rateLimit', (info) => {
      logger.warn({ info }, 'Discord rate limit hit');
    });
  }

  async start(): Promise<void> {
    logger.info('Starting Eltron Bot...');

    await this.loadCommands();
    await this.loadEvents();

    await this.login(env.DISCORD_TOKEN);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down gracefully...');
    this.clearCooldownTimers();
    this.removeAllListeners();
    this.destroy();
    logger.info('Bot shut down successfully');
  }

  clearCooldownTimers(): void {
    for (const timer of this.cooldownTimers.values()) {
      clearTimeout(timer);
    }
    this.cooldownTimers.clear();
    this.cooldowns.clear();
  }

  setCooldownTimer(key: string, timer: ReturnType<typeof setTimeout>): void {
    const existing = this.cooldownTimers.get(key);
    if (existing) clearTimeout(existing);
    this.cooldownTimers.set(key, timer);
  }

  removeCooldownTimer(key: string): void {
    const timer = this.cooldownTimers.get(key);
    if (timer) clearTimeout(timer);
    this.cooldownTimers.delete(key);
  }

  private async loadCommands(): Promise<void> {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFolders = fs.readdirSync(commandsPath);

    let loadedCount = 0;
    let failedCount = 0;

    for (const folder of commandFolders) {
      const folderPath = path.join(commandsPath, folder);
      const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        try {
          const commandModule = await import(filePath);
          const command: Command = commandModule.default || commandModule;

          if ('data' in command && 'execute' in command) {
            this.commands.set(command.data.name, command);
            loadedCount++;
          } else {
            logger.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
          }
        } catch (error) {
          logger.error({ err: error }, `Failed to load command at ${filePath}`);
          failedCount++;
        }
      }
    }

    logger.info(`Loaded ${loadedCount} commands${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
  }

  private async loadEvents(): Promise<void> {
    const eventsPath = path.join(__dirname, '..', 'events');
    const eventFolders = fs.readdirSync(eventsPath);

    let loadedCount = 0;
    let failedCount = 0;

    for (const folder of eventFolders) {
      const folderPath = path.join(eventsPath, folder);
      const eventFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

      for (const file of eventFiles) {
        const filePath = path.join(folderPath, file);
        try {
          const eventModule = await import(filePath);
          const event: Event<keyof import('discord.js').ClientEvents> = eventModule.default || eventModule;

          if ('name' in event && 'execute' in event) {
            if (event.once) {
              this.once(event.name, (...args) => event.execute(this, ...args));
            } else {
              this.on(event.name, (...args) => event.execute(this, ...args));
            }
            this.events.set(event.name, event);
            loadedCount++;
          } else {
            logger.warn(`Event at ${filePath} is missing required "name" or "execute" property.`);
          }
        } catch (error) {
          logger.error({ err: error }, `Failed to load event at ${filePath}`);
          failedCount++;
        }
      }
    }

    logger.info(`Loaded ${loadedCount} events${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
  }
}
