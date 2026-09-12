import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { logger } from '../../utils/logger';
import { LockdownRepository } from '../../database/repositories/LockdownRepository';

const lockdownRepo = new LockdownRepository();

export default class LockdownCheckerEvent extends Event<'ready'> {
  name = 'ready' as const;
  once = true;

  async execute(client: EltronClient): Promise<void> {
    await this.checkExpiredLockdowns(client);

    setInterval(async () => {
      await this.checkExpiredLockdowns(client);
    }, 60_000);
  }

  private async checkExpiredLockdowns(client: EltronClient): Promise<void> {
    try {
      const expired = await lockdownRepo.getExpired();

      for (const lockdown of expired) {
        try {
          const guild = client.guilds.cache.get(lockdown.guild_id);
          if (!guild) {
            await lockdownRepo.delete(lockdown.channel_id);
            continue;
          }

          const channel = guild.channels.cache.get(lockdown.channel_id);
          if (!channel || !channel.isTextBased()) {
            await lockdownRepo.delete(lockdown.channel_id);
            continue;
          }

          await (channel as import('discord.js').GuildChannel).permissionOverwrites.edit(
            guild.id,
            { SendMessages: null },
            { reason: 'Auto-unlock: lockdown duration expired' }
          );

          await lockdownRepo.delete(lockdown.channel_id);
          logger.info(`Auto-unlocked channel ${lockdown.channel_id} in guild ${lockdown.guild_id}`);
        } catch (error) {
          logger.error(`Failed to auto-unlock channel ${lockdown.channel_id}`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to check expired lockdowns', error);
    }
  }
}
