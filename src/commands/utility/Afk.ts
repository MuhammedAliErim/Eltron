import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { Command, type CommandExecuteOptions } from '../../structures/Command';
import { setAfk } from '../../services/afk/AfkService';
import { logError } from '../../utils/logger';
import { GuildOnlyError } from '../../utils/errors';

export default class AfkCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set your AFK status')
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for being AFK').setRequired(false).setMaxLength(100)
    );

  category = 'Utility';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guildId) throw new GuildOnlyError();

    try {
      const reason = interaction.options.getString('reason') || 'AFK';

      await setAfk(interaction.guildId, interaction.user.id, reason, interaction.channelId);

      const embed = new EmbedBuilder()
        .setDescription(`You are now AFK: ${reason}`)
        .setColor(Colors.Greyple);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logError(`Error executing AFK command for user ${interaction.user.id}`, error);
      await interaction.reply({ content: '❌ Failed to set AFK status.', ephemeral: true }).catch(() => {});
    }
  }
}
