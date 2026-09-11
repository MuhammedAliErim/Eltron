import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, Colors, ChannelType, Guild } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { StatsChannelRepository } from '../../database/repositories/StatsChannelRepository';

const STAT_TYPES = ['members', 'online', 'text_channels', 'voice_channels', 'roles', 'emojis', 'boosts'] as const;

const repo = new StatsChannelRepository();

export default class StatsChannelCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('statschannel')
    .setDescription('Manage auto-updating stat channels')
    .addSubcommand(sub =>
      sub.setName('create').setDescription('Create a stat channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel to use').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
        .addStringOption(opt => opt.setName('type').setDescription('Stat type').setRequired(true)
          .addChoices(...STAT_TYPES.map(t => ({ name: t.replace('_', ' '), value: t }))))
        .addStringOption(opt => opt.setName('format').setDescription('Format (use {count} for number)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('remove').setDescription('Remove a stat channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all stat channels')
    )
    .addSubcommand(sub =>
      sub.setName('update').setDescription('Force update all stat channels now')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

  category = 'Utility';
  cooldown = 10;
  requiredPermissions = [PermissionFlagsBits.ManageChannels];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      const channel = interaction.options.getChannel('channel', true);
      const statType = interaction.options.getString('type', true);
      const format = interaction.options.getString('format') || '{count}';

      const existing = await repo.getByChannel(channel.id);
      if (existing) {
        await interaction.reply({ content: '❌ This channel is already a stats channel.', flags: MessageFlags.Ephemeral });
        return;
      }

      await repo.create({
        guild_id: interaction.guild.id,
        channel_id: channel.id,
        stat_type: statType,
        format,
      });

      const embed = new EmbedBuilder()
        .setTitle('✅ Stats Channel Created')
        .setColor(Colors.Green)
        .addFields(
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Type', value: statType.replace('_', ' '), inline: true },
          { name: 'Format', value: format, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else if (subcommand === 'remove') {
      const channel = interaction.options.getChannel('channel', true);
      const existing = await repo.getByChannel(channel.id);
      if (!existing) {
        await interaction.reply({ content: '❌ This channel is not a stats channel.', flags: MessageFlags.Ephemeral });
        return;
      }
      await repo.delete(existing.id);
      await interaction.reply({ content: `✅ Stats channel removed from <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
    } else if (subcommand === 'list') {
      const channels = await repo.getByGuild(interaction.guild.id);
      if (channels.length === 0) {
        await interaction.reply({ content: '📊 No stats channels configured.', flags: MessageFlags.Ephemeral });
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle('📊 Stats Channels')
        .setColor(Colors.Blurple)
        .setDescription(channels.map(c => `<#${c.channel_id}> — **${c.stat_type.replace('_', ' ')}** — \`${c.format}\``).join('\n'))
        .setTimestamp();
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else if (subcommand === 'update') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const channels = await repo.getByGuild(interaction.guild.id);
      let updated = 0;
      for (const sc of channels) {
        try {
          const ch = await interaction.guild.channels.fetch(sc.channel_id);
          if (!ch || !('setName' in ch)) continue;
          const value = this.getStatValue(interaction.guild, sc.stat_type);
          const newName = sc.format.replace('{count}', String(value));
          if (ch.name !== newName) {
            await ch.setName(newName);
            updated++;
          }
        } catch { /* skip */ }
      }
      await interaction.editReply({ content: `✅ Updated **${updated}** stats channels.` });
    }
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
