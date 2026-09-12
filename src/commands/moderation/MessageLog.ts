import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  Colors,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { MessageLogService } from '../../services/message-log/MessageLogService';
import { logger } from '../../utils/logger';

export default class MessageLogCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('messagelog')
    .setDescription('View message edit/delete logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('search')
        .setDescription('Search message logs')
        .addStringOption((opt) =>
          opt.setName('query').setDescription('Search query').setRequired(true).setMaxLength(100)
        )
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Filter by user').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Show logs for a channel')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel to search').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('limit').setDescription('Number of logs').setRequired(false).setMinValue(1).setMaxValue(100)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('recent')
        .setDescription('Show recent logs')
        .addIntegerOption((opt) =>
          opt.setName('limit').setDescription('Number of logs').setRequired(false).setMinValue(1).setMaxValue(100)
        )
    );

  category = 'Moderation';
  cooldown = 10;
  requiredPermissions = [PermissionFlagsBits.ManageGuild];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'search':
        return this.handleSearch(interaction);
      case 'channel':
        return this.handleChannel(interaction);
      case 'recent':
        return this.handleRecent(interaction);
    }
  }

  private async handleSearch(interaction: ChatInputCommandInteraction): Promise<void> {
    const query = interaction.options.getString('query', true);
    const user = interaction.options.getUser('user');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const result = await MessageLogService.searchLogs(
        interaction.guildId!,
        query,
        user?.id
      );

      if (result.data.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🔍 Message Log Search')
          .setDescription('No results found.')
          .setColor(Colors.Greyple);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const actionEmoji: Record<string, string> = {
        edit: '✏️',
        delete: '🗑️',
      };

      const fields = result.data.slice(0, 10).map((log) => {
        const content = log.action === 'edit'
          ? `${log.old_content?.substring(0, 100) || 'N/A'} → ${log.new_content?.substring(0, 100) || 'N/A'}`
          : log.old_content?.substring(0, 200) || 'N/A';

        return {
          name: `${actionEmoji[log.action] || '📝'} ${log.action} — <#${log.channel_id}>`,
          value: `User: <@${log.author_id}>\nContent: ${content}\nDate: <t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>`,
          inline: false,
        };
      });

      const embed = new EmbedBuilder()
        .setTitle('🔍 Message Log Search')
        .setDescription(`Results for "${query}"`)
        .setColor(Colors.Blue)
        .addFields(fields)
        .setFooter({ text: `Total: ${result.total} result(s)` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, 'Error searching message logs');
      await interaction.editReply({ content: '❌ An error occurred while searching logs.' });
    }
  }

  private async handleChannel(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.options.getChannel('channel', true);
    const limit = interaction.options.getInteger('limit') || 25;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const result = await MessageLogService.getLogs(interaction.guildId!, {
        channelId: channel.id,
        limit,
      });

      if (result.data.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`📋 Message Logs — ${channel.name}`)
          .setDescription('No logs found for this channel.')
          .setColor(Colors.Greyple);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const actionEmoji: Record<string, string> = {
        edit: '✏️',
        delete: '🗑️',
      };

      const fields = result.data.slice(0, 15).map((log) => {
        const content = log.action === 'edit'
          ? `${log.old_content?.substring(0, 80) || 'N/A'} → ${log.new_content?.substring(0, 80) || 'N/A'}`
          : log.old_content?.substring(0, 150) || 'N/A';

        return {
          name: `${actionEmoji[log.action] || '📝'} <@${log.author_id}>`,
          value: `Content: ${content}\nDate: <t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>`,
          inline: false,
        };
      });

      const embed = new EmbedBuilder()
        .setTitle(`📋 Message Logs — ${channel.name}`)
        .setColor(Colors.Blue)
        .addFields(fields)
        .setFooter({ text: `Total: ${result.total} log(s)` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching channel message logs');
      await interaction.editReply({ content: '❌ An error occurred while fetching logs.' });
    }
  }

  private async handleRecent(interaction: ChatInputCommandInteraction): Promise<void> {
    const limit = interaction.options.getInteger('limit') || 25;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const logs = await MessageLogService.getRecentLogs(interaction.guildId!, limit);

      if (logs.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📋 Recent Message Logs')
          .setDescription('No recent logs found.')
          .setColor(Colors.Greyple);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const actionEmoji: Record<string, string> = {
        edit: '✏️',
        delete: '🗑️',
      };

      const fields = logs.slice(0, 15).map((log) => {
        const content = log.action === 'edit'
          ? `${log.old_content?.substring(0, 80) || 'N/A'} → ${log.new_content?.substring(0, 80) || 'N/A'}`
          : log.old_content?.substring(0, 150) || 'N/A';

        return {
          name: `${actionEmoji[log.action] || '📝'} <@${log.author_id}> in <#${log.channel_id}>`,
          value: `Content: ${content}\nDate: <t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>`,
          inline: false,
        };
      });

      const embed = new EmbedBuilder()
        .setTitle('📋 Recent Message Logs')
        .setColor(Colors.Blue)
        .addFields(fields)
        .setFooter({ text: `Showing ${logs.length} log(s)` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching recent message logs');
      await interaction.editReply({ content: '❌ An error occurred while fetching logs.' });
    }
  }
}
