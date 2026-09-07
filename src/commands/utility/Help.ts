import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class HelpCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all available commands.');

  cooldown = 5;

  async execute({ client, interaction }: CommandExecuteOptions): Promise<void> {
    const commands = client.commands;

    const categories = new Map<string, string[]>();

    commands.forEach((command) => {
      const category = 'Utility';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(`\`/${command.data.name}\` - ${command.data.description}`);
    });

    const embed = new EmbedBuilder()
      .setTitle('Eltron Bot - Commands')
      .setDescription('Here are all available commands:')
      .setColor(0x5865f2)
      .setTimestamp();

    categories.forEach((cmds, category) => {
      embed.addFields({ name: category, value: cmds.join('\n') });
    });

    embed.setFooter({ text: `Total: ${commands.size} commands` });

    await interaction.reply({ embeds: [embed] });
  }
}
