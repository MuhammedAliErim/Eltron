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
import { AutoResponseRepository } from '../../database/repositories/AutoResponseRepository';
import { invalidateGuildCache } from '../../services/auto-response/AutoResponseService';

const repo = new AutoResponseRepository();

export default class AutoResponseCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('autoresponse')
    .setDescription('Manage auto-responses')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new auto-response')
        .addStringOption((opt) =>
          opt.setName('trigger').setDescription('Trigger text').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('response').setDescription('Response message').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('match_type')
            .setDescription('Match type')
            .setRequired(true)
            .addChoices(
              { name: 'Contains', value: 'contains' },
              { name: 'Exact', value: 'exact' },
              { name: 'Starts With', value: 'starts_with' },
              { name: 'Ends With', value: 'ends_with' },
              { name: 'Regex', value: 'regex' }
            )
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Limit to this channel (optional)')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove an auto-response')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Auto-response ID').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all auto-responses')
    )
    .addSubcommand((sub) =>
      sub
        .setName('edit')
        .setDescription('Edit an auto-response')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Auto-response ID').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('trigger').setDescription('New trigger text')
        )
        .addStringOption((opt) =>
          opt.setName('response').setDescription('New response message')
        )
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Enable or disable')
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  category = 'AutoMod';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ManageGuild];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'create':
        return this.handleCreate(interaction);
      case 'remove':
        return this.handleRemove(interaction);
      case 'list':
        return this.handleList(interaction);
      case 'edit':
        return this.handleEdit(interaction);
    }
  }

  private async handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
    const trigger = interaction.options.getString('trigger', true);
    const response = interaction.options.getString('response', true);
    const matchType = interaction.options.getString('match_type', true);
    const channel = interaction.options.getChannel('channel');

    if (matchType === 'regex') {
      try {
        new RegExp(trigger);
      } catch {
        await interaction.editReply({ content: 'Invalid regex pattern.' });
        return;
      }
    }

    const channelIds = channel ? [channel.id] : [];
    const excludedChannelIds: string[] = [];

    const created = await repo.create({
      guild_id: interaction.guildId!,
      trigger_text: trigger,
      response_text: response,
      match_type: matchType,
      channel_ids: channelIds,
      excluded_channel_ids: excludedChannelIds,
      created_by: interaction.user.id,
    });

    invalidateGuildCache(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setTitle('Auto-Response Created')
      .setColor(Colors.Green)
      .addFields(
        { name: 'Trigger', value: trigger.length > 100 ? trigger.substring(0, 100) + '...' : trigger },
        { name: 'Response', value: response.length > 100 ? response.substring(0, 100) + '...' : response },
        { name: 'Match Type', value: matchType, inline: true },
        { name: 'Channel', value: channel ? `<#${channel.id}>` : 'All channels', inline: true },
        { name: 'ID', value: created.id, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
    const id = interaction.options.getString('id', true);

    const existing = await repo.getById(id);
    if (!existing || existing.guild_id !== interaction.guildId!) {
      await interaction.editReply({ content: 'Auto-response not found.' });
      return;
    }

    await repo.delete(id);
    invalidateGuildCache(interaction.guildId!);

    await interaction.editReply({ content: 'Auto-response deleted.' });
  }

  private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
    const responses = await repo.getByGuild(interaction.guildId!);

    if (responses.length === 0) {
      await interaction.editReply({ content: 'No auto-responses configured.' });
      return;
    }

    const pageSize = 10;
    const page = 1;
    const totalPages = Math.ceil(responses.length / pageSize);
    const pageItems = responses.slice((page - 1) * pageSize, page * pageSize);

    const embed = new EmbedBuilder()
      .setTitle('Auto-Responses')
      .setColor(Colors.Blue)
      .setDescription(
        pageItems
          .map(
            (r) =>
              `**ID:** \`${r.id}\`\n**Trigger:** ${r.trigger_text.length > 50 ? r.trigger_text.substring(0, 50) + '...' : r.trigger_text}\n**Response:** ${r.response_text.length > 50 ? r.response_text.substring(0, 50) + '...' : r.response_text}\n**Type:** ${r.match_type} | **Enabled:** ${r.enabled ? 'Yes' : 'No'}`
          )
          .join('\n\n')
      )
      .setFooter({ text: `Page ${page}/${totalPages} • ${responses.length} total` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleEdit(interaction: ChatInputCommandInteraction): Promise<void> {
    const id = interaction.options.getString('id', true);
    const trigger = interaction.options.getString('trigger');
    const response = interaction.options.getString('response');
    const enabled = interaction.options.getBoolean('enabled');

    const existing = await repo.getById(id);
    if (!existing || existing.guild_id !== interaction.guildId!) {
      await interaction.editReply({ content: 'Auto-response not found.' });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (trigger !== null) updates.trigger_text = trigger;
    if (response !== null) updates.response_text = response;
    if (enabled !== null) updates.enabled = enabled;

    if (Object.keys(updates).length === 0) {
      await interaction.editReply({ content: 'No changes specified.' });
      return;
    }

    await repo.update(id, updates as any);
    invalidateGuildCache(interaction.guildId!);

    await interaction.editReply({ content: 'Auto-response updated.' });
  }
}
