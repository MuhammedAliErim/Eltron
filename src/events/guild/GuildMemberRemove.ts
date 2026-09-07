import { GuildMember } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { WelcomeRepository } from '../../database/repositories/WelcomeRepository';
import { sendGoodbye } from '../../services/welcome/WelcomeService';
import { logger } from '../../utils/logger';
import { recordMemberLeave } from '../../services/analytics/AnalyticsService';

const welcomeRepo = new WelcomeRepository();

export default class GuildMemberRemoveEvent extends Event<'guildMemberRemove'> {
  name = 'guildMemberRemove' as const;

  async execute(client: EltronClient, member: GuildMember): Promise<void> {
    try {
      if (member.user.bot) return;
      if (!member.guild) return;

      const config = await welcomeRepo.getConfig(member.guild.id);
      await sendGoodbye(member, config);
    } catch (error) {
      logger.error({
        err: error,
        guildId: member.guild.id,
        userId: member.id,
      }, 'Error in GuildMemberRemove goodbye');
    }

    recordMemberLeave(member.guild.id).catch(() => {});
  }
}
