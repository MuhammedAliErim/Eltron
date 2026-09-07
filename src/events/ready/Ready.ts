import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { logger } from '../../utils/logger';
import { deployCommands } from '../../handlers/CommandDeployer';

export default class ReadyEvent extends Event<'ready'> {
  name = 'ready' as const;
  once = true;

  async execute(client: EltronClient): Promise<void> {
    logger.info(`Logged in as ${client.user?.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);
    logger.info(`Serving ${client.users.cache.size} users`);

    await deployCommands(client);

    client.user?.setActivity('Eltron Bot | /help', { type: 0 });
  }
}
