import { Events, Guild } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { logger } from '../../utils/logger';
import { StatsChannelRepository } from '../../database/repositories/StatsChannelRepository';

const UPDATE_INTERVAL = 5 * 60 * 1000;
const repo = new StatsChannelRepository();

export default class StatsChannelUpdaterEvent extends Event<'ready'> {
  name = Events.ClientReady as const;
  once = true;

  async execute(client: EltronClient): Promise<void> {
    logger.info('Starting stats channel auto-updater (every 5 minutes)');

    const update = async () => {
      for (const [, guild] of client.guilds.cache) {
        try {
          const channels = await repo.getByGuild(guild.id);
          for (const sc of channels) {
            try {
              const ch = await guild.channels.fetch(sc.channel_id);
              if (!ch || !('setName' in ch)) continue;
              const value = this.getStatValue(guild, sc.stat_type);
              const newName = sc.format.replace('{count}', String(value));
              if (ch.name !== newName) {
                await ch.setName(newName);
                await repo.update(sc.id, { last_updated: new Date().toISOString() });
              }
            } catch { /* skip */ }
          }
        } catch { /* skip guild */ }
      }
    };

    setInterval(update, UPDATE_INTERVAL);
  }

  private getStatValue(guild: Guild, type: string): number {
    switch (type) {
      case 'members': return guild.memberCount;
      case 'online': return guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
      case 'text_channels': return guild.channels.cache.filter(c => c.isTextBased()).size;
      case 'voice_channels': return guild.channels.cache.filter(c => c.isVoiceBased()).size;
      case 'roles': return guild.roles.cache.size;
      case 'emojis': return guild.emojis.cache.size;
      case 'boosts': return guild.premiumSubscriptionCount ?? 0;
      default: return 0;
    }
  }
}
