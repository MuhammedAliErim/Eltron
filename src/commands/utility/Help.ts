import {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { COMMAND_CATEGORIES, HELP_CATEGORIES, categorySelectMenu } from '../../utils/ui';
import type { HelpCategory } from '../../utils/ui';
import { logger } from '../../utils/logger';

export default class HelpCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all available commands.');

  category = 'Utility';
  cooldown = 5;

  async execute({ client, interaction }: CommandExecuteOptions): Promise<void> {
    const embed = this.buildMainEmbed(client);

    const row = categorySelectMenu('help:category', HELP_CATEGORIES.map((c) => ({
      label: c.label,
      value: c.value,
      description: c.description,
      emoji: c.emoji,
    })));

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120_000,
    });

    collector.on('collect', async (i: StringSelectMenuInteraction) => {
      if (i.customId === 'help:category') {
        const selected = i.values[0] as HelpCategory;
        const categoryEmbed = this.buildCategoryEmbed(client, selected);
        const backRow = categorySelectMenu('help:category', HELP_CATEGORIES.map((c) => ({
          label: c.label,
          value: c.value,
          description: c.description,
          emoji: c.emoji,
        })));
        await i.update({ embeds: [categoryEmbed], components: [backRow] });
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  }

  private buildMainEmbed(client: import('../../structures/EltronClient').EltronClient): EmbedBuilder {
    const commandCount = client.commands.size;
    const categoryCount = HELP_CATEGORIES.length;

    const fields = HELP_CATEGORIES.map((cat) => {
      const count = [...client.commands.values()].filter(
        (cmd) => (cmd.category || 'Utility') === cat.value
      ).length;
      return {
        name: `${cat.emoji} ${cat.label}`,
        value: `${cat.description} — **${count}** command(s)`,
        inline: false,
      };
    });

    return new EmbedBuilder()
      .setTitle('Eltron Bot — Commands')
      .setDescription(`Use the select menu below to browse commands by category.\n\n**${commandCount}** commands across **${categoryCount}** categories.`)
      .setColor(Colors.Blurple)
      .addFields(fields)
      .setTimestamp()
      .setFooter({ text: 'Eltron Bot' });
  }

  private buildCategoryEmbed(
    client: import('../../structures/EltronClient').EltronClient,
    category: HelpCategory,
  ): EmbedBuilder {
    const cat = HELP_CATEGORIES.find((c) => c.value === category);
    const categoryEmoji = cat?.emoji ?? '📋';

    const commands = [...client.commands.values()]
      .filter((cmd) => (cmd.category || 'Utility') === category)
      .sort((a, b) => a.data.name.localeCompare(b.data.name));

    if (commands.length === 0) {
      return new EmbedBuilder()
        .setTitle(`${categoryEmoji} ${category}`)
        .setDescription('No commands in this category.')
        .setColor(Colors.Greyple)
        .setTimestamp();
    }

    const fields = commands.map((cmd) => {
      const name = `\`/${cmd.data.name}\``;
      let value = cmd.data.description;

      if (cmd.requiredPermissions && cmd.requiredPermissions.length > 0) {
        value += '\n*Requires permissions*';
      }

      return { name, value, inline: false };
    });

    return new EmbedBuilder()
      .setTitle(`${categoryEmoji} ${category}`)
      .setDescription(`${commands.length} command(s)`)
      .setColor(Colors.Blurple)
      .addFields(fields)
      .setTimestamp()
      .setFooter({ text: 'Select another category or wait to close' });
  }
}
