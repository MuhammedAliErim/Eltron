import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  Colors,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { StarboardRepository } from '../../database/repositories/StarboardRepository';
import { logger } from '../../utils/logger';

const repo = new StarboardRepository();

export default class StarboardCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Configure the starboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Set up the starboard')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Starboard channel').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('threshold').setDescription('Stars required').setRequired(false).setMinValue(1).setMaxValue(50)
        )
        .addStringOption((opt) =>
          opt.setName('emoji').setDescription('Star emoji').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('Update starboard config')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Enable/disable starboard').setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt.setName('self_star').setDescription('Allow self starring').setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt.setName('threshold').setDescription('Stars required').setRequired(false).setMinValue(1).setMaxValue(50)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('top')
        .setDescription('Show top starred messages')
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
      case 'setup':
        return this.handleSetup(interaction);
      case 'config':
        return this.handleConfig(interaction);
      case 'top':
        return this.handleTop(interaction);
    }
  }

  private async handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.options.getChannel('channel', true);
    const threshold = interaction.options.getInteger('threshold') || 5;
    const emoji = interaction.options.getString('emoji') || '⭐';

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetChannel = await interaction.guild!.channels.fetch(channel.id).catch(() => null);
    if (!targetChannel || !targetChannel.isTextBased()) {
      await interaction.editReply({ content: '❌ Please select a text channel.' });
      return;
    }

    await repo.upsertConfig({
      guild_id: interaction.guildId!,
      channel_id: channel.id,
      threshold,
      emoji,
    });

    const embed = new EmbedBuilder()
      .setTitle('⭐ Starboard Setup')
      .setDescription(`Starboard has been configured.`)
      .addFields(
        { name: 'Channel', value: `${targetChannel}`, inline: true },
        { name: 'Threshold', value: `${threshold}`, inline: true },
        { name: 'Emoji', value: emoji, inline: true }
      )
      .setColor(Colors.Gold)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleConfig(interaction: ChatInputCommandInteraction): Promise<void> {
    const enabled = interaction.options.getBoolean('enabled');
    const selfStar = interaction.options.getBoolean('self_star');
    const threshold = interaction.options.getInteger('threshold');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const existing = await repo.getConfig(interaction.guildId!);
    if (!existing) {
      await interaction.editReply({ content: '❌ Starboard is not set up. Use `/starboard setup` first.' });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (enabled !== null) updates.enabled = enabled;
    if (selfStar !== null) updates.self_star = selfStar;
    if (threshold !== null) updates.threshold = threshold;

    if (Object.keys(updates).length === 0) {
      await interaction.editReply({ content: '❌ No changes specified.' });
      return;
    }

    await repo.upsertConfig({
      guild_id: interaction.guildId!,
      channel_id: existing.channel_id,
      ...updates,
    });

    const embed = new EmbedBuilder()
      .setTitle('⭐ Starboard Config Updated')
      .setColor(Colors.Gold)
      .setTimestamp();

    if (enabled !== null) embed.addFields({ name: 'Enabled', value: `${enabled}`, inline: true });
    if (selfStar !== null) embed.addFields({ name: 'Self Star', value: `${selfStar}`, inline: true });
    if (threshold !== null) embed.addFields({ name: 'Threshold', value: `${threshold}`, inline: true });

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleTop(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const entries = await repo.getTopEntries(interaction.guildId!, 10);

    if (entries.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('⭐ Top Starred Messages')
        .setDescription('No starred messages yet.')
        .setColor(Colors.Greyple);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const config = await repo.getConfig(interaction.guildId!);
    const emoji = config?.emoji || '⭐';

    const fields = entries.map((entry, index) => ({
      name: `#${index + 1} — ${emoji} ${entry.star_count}`,
      value: `By: <@${entry.author_id}>\nChannel: <#${entry.original_channel_id}>\n[Jump to message](https://discord.com/channels/${entry.guild_id}/${entry.original_channel_id}/${entry.original_message_id})`,
      inline: false,
    }));

    const embed = new EmbedBuilder()
      .setTitle('⭐ Top Starred Messages')
      .setColor(Colors.Gold)
      .addFields(fields)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
