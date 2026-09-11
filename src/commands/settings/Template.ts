import {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
  MessageFlags,
  PermissionFlagsBits,
  AttachmentBuilder,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { exportConfig, importConfig, getConfigTemplate, type ServerTemplate } from '../../services/template/ServerTemplateService';
import { logError } from '../../utils/logger';

export default class TemplateCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('template')
    .setDescription('Export or import server configurations')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('export')
        .setDescription('Export server configuration as JSON')
    )
    .addSubcommand((sub) =>
      sub
        .setName('import')
        .setDescription('Import server configuration from JSON')
        .addStringOption((opt) =>
          opt
            .setName('config')
            .setDescription('JSON configuration string')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('template')
        .setDescription('Show a blank configuration template')
    );

  category = 'Utility';
  cooldown = 30;
  requiredPermissions = [PermissionFlagsBits.ManageGuild];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'export':
        return this.handleExport(interaction);
      case 'import':
        return this.handleImport(interaction);
      case 'template':
        return this.handleTemplate(interaction);
    }
  }

  private async handleExport(interaction: CommandExecuteOptions['interaction']): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const config = await exportConfig(interaction.guildId!);
      const json = JSON.stringify(config, null, 2);

      if (json.length > 1900) {
        const buffer = Buffer.from(json, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, {
          name: `server-template-${interaction.guildId}.json`,
        });

        const embed = new EmbedBuilder()
          .setTitle('Server Configuration Exported')
          .setDescription(`Configuration exported for **${interaction.guild!.name}**.\nThe file is attached below.`)
          .addFields(
            { name: 'Sections', value: Object.keys(config.sections).join(', ') || 'None', inline: false },
            { name: 'Version', value: config.version, inline: true },
          )
          .setColor(Colors.Blurple)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed], files: [attachment] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('Server Configuration Exported')
          .setDescription(`Configuration exported for **${interaction.guild!.name}**.`)
          .addFields(
            { name: 'Sections', value: Object.keys(config.sections).join(', ') || 'None', inline: false },
          )
          .setColor(Colors.Blurple)
          .setTimestamp();

        await interaction.editReply({
          embeds: [embed],
          content: `\`\`\`json\n${json}\n\`\`\``,
        });
      }
    } catch (error) {
      logError('Template export failed', error);
      await interaction.editReply({ content: 'Failed to export configuration.' });
    }
  }

  private async handleImport(interaction: CommandExecuteOptions['interaction']): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const configStr = interaction.options.getString('config', true);

    let config: ServerTemplate;
    try {
      config = JSON.parse(configStr);
    } catch {
      await interaction.editReply({ content: 'Invalid JSON format. Please provide valid JSON.' });
      return;
    }

    if (!config.sections || typeof config.sections !== 'object') {
      await interaction.editReply({ content: 'Invalid configuration: missing `sections` field.' });
      return;
    }

    try {
      const results = await importConfig(interaction.guildId!, config);

      const lines = results.map((r) => {
        const icon = r.success ? '✅' : '❌';
        const error = r.error ? ` (${r.error})` : '';
        return `${icon} **${r.section}**${error}`;
      });

      const embed = new EmbedBuilder()
        .setTitle('Server Configuration Imported')
        .setDescription(`Import results for **${interaction.guild!.name}**:\n\n${lines.join('\n')}`)
        .setColor(results.every((r) => r.success) ? Colors.Green : Colors.Orange)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logError('Template import failed', error);
      await interaction.editReply({ content: 'Failed to import configuration.' });
    }
  }

  private async handleTemplate(interaction: CommandExecuteOptions['interaction']): Promise<void> {
    const template = getConfigTemplate();
    const json = JSON.stringify(template, null, 2);

    if (json.length > 1900) {
      const buffer = Buffer.from(json, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, {
        name: 'server-template-blank.json',
      });

      const embed = new EmbedBuilder()
        .setTitle('Blank Server Template')
        .setDescription('Use this template to configure your import. Edit the values and use `/template import`.')
        .setColor(Colors.Blurple)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], files: [attachment], flags: MessageFlags.Ephemeral });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('Blank Server Template')
        .setDescription('Use this template to configure your import. Edit the values and use `/template import`.')
        .setColor(Colors.Blurple)
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        content: `\`\`\`json\n${json}\n\`\`\``,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
