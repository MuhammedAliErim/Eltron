import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, Colors, ChannelType, GuildChannel, TextChannel } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { LockdownRepository } from '../../database/repositories/LockdownRepository';

const lockdownRepo = new LockdownRepository();

function parseDuration(input: string): number | null {
  const match = input.match(/^(\d+)(m|h|d)$/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

export default class LockdownCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Emergency lockdown - lock all or specific channels')
    .addSubcommand(sub =>
      sub
        .setName('lock')
        .setDescription('Lock channels')
        .addStringOption(opt => opt.setName('channels').setDescription('Comma separated channel IDs, or "all"').setRequired(false))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for lockdown').setRequired(false).setMaxLength(512))
        .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 30m, 1h, 1d)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('unlock')
        .setDescription('Unlock channels')
        .addStringOption(opt => opt.setName('channels').setDescription('Comma separated channel IDs, or "all"').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Show all currently locked channels')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  category = 'Moderation';
  cooldown = 10;
  requiredPermissions = [PermissionFlagsBits.Administrator];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'status') {
      await this.handleStatus(interaction);
    } else if (subcommand === 'lock') {
      await this.handleLock(interaction);
    } else if (subcommand === 'unlock') {
      await this.handleUnlock(interaction);
    }
  }

  private async handleLock(interaction: CommandExecuteOptions['interaction']): Promise<void> {
    const channelsInput = interaction.options.getString('channels');
    const reason = interaction.options.getString('reason') || 'Server lockdown';
    const durationInput = interaction.options.getString('duration');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild!;
    let durationMs: number | null = null;
    let unlockAt: string | null = null;
    let autoUnlockMinutes = 0;

    if (durationInput) {
      durationMs = parseDuration(durationInput);
      if (!durationMs) {
        await interaction.editReply({ content: '❌ Invalid duration format. Use format like `30m`, `1h`, or `1d`.' });
        return;
      }
      autoUnlockMinutes = Math.floor(durationMs / 60000);
      unlockAt = new Date(Date.now() + durationMs).toISOString();
    }

    let targetChannels: GuildChannel[] = [];

    if (channelsInput?.toLowerCase() === 'all') {
      targetChannels = guild.channels.cache.filter(
        ch => ch.isTextBased() && !ch.isDMBased() && ch.type !== ChannelType.GuildAnnouncement && ch.type !== ChannelType.GuildForum
      ).map(ch => ch as GuildChannel);
    } else if (channelsInput) {
      const ids = channelsInput.split(',').map(s => s.trim()).filter(Boolean);
      for (const id of ids) {
        const cleanId = id.replace(/[<#>]/g, '');
        const ch = guild.channels.cache.get(cleanId);
        if (ch && ch.isTextBased() && !ch.isDMBased()) {
          targetChannels.push(ch as GuildChannel);
        }
      }
    } else {
      targetChannels = guild.channels.cache.filter(
        ch => ch.isTextBased() && !ch.isDMBased() && ch.type !== ChannelType.GuildAnnouncement && ch.type !== ChannelType.GuildForum
      ).map(ch => ch as GuildChannel);
    }

    if (targetChannels.length === 0) {
      await interaction.editReply({ content: '❌ No valid text channels found to lock.' });
      return;
    }

    const lockedChannels: string[] = [];
    const failedChannels: string[] = [];

    for (const channel of targetChannels) {
      try {
        await channel.permissionOverwrites.edit(guild.id, { SendMessages: false }, { reason: `Lockdown by ${interaction.user.tag}: ${reason}` });
        await lockdownRepo.create({
          guild_id: guild.id,
          channel_id: channel.id,
          locked_by: interaction.user.id,
          reason,
          auto_unlock_minutes: autoUnlockMinutes,
          unlock_at: unlockAt,
        });
        lockedChannels.push(`<#${channel.id}>`);
      } catch {
        failedChannels.push(`<#${channel.id}>`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🔒 Lockdown Activated')
      .setColor(Colors.Red)
      .setDescription(`**${lockedChannels.length}** channel(s) locked.`)
      .addFields(
        { name: 'Channels', value: lockedChannels.join(', ') || 'None', inline: false },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Locked by', value: `${interaction.user.tag}`, inline: true }
      )
      .setTimestamp();

    if (durationInput) {
      embed.addFields({ name: 'Auto-unlock', value: `In ${durationInput}`, inline: true });
    }

    if (failedChannels.length > 0) {
      embed.addFields({ name: 'Failed', value: failedChannels.join(', '), inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleUnlock(interaction: CommandExecuteOptions['interaction']): Promise<void> {
    const channelsInput = interaction.options.getString('channels');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild!;

    let targetChannels: GuildChannel[] = [];

    if (channelsInput?.toLowerCase() === 'all') {
      const lockdowns = await lockdownRepo.getByGuild(guild.id);
      for (const ld of lockdowns) {
        const ch = guild.channels.cache.get(ld.channel_id);
        if (ch && ch.isTextBased() && !ch.isDMBased()) {
          targetChannels.push(ch as GuildChannel);
        }
      }
    } else if (channelsInput) {
      const ids = channelsInput.split(',').map(s => s.trim()).filter(Boolean);
      for (const id of ids) {
        const cleanId = id.replace(/[<#>]/g, '');
        const ch = guild.channels.cache.get(cleanId);
        if (ch && ch.isTextBased() && !ch.isDMBased()) {
          targetChannels.push(ch as GuildChannel);
        }
      }
    } else {
      const lockdowns = await lockdownRepo.getByGuild(guild.id);
      for (const ld of lockdowns) {
        const ch = guild.channels.cache.get(ld.channel_id);
        if (ch && ch.isTextBased() && !ch.isDMBased()) {
          targetChannels.push(ch as GuildChannel);
        }
      }
    }

    if (targetChannels.length === 0) {
      await interaction.editReply({ content: '❌ No locked channels found to unlock.' });
      return;
    }

    const unlockedChannels: string[] = [];
    const failedChannels: string[] = [];

    for (const channel of targetChannels) {
      try {
        await channel.permissionOverwrites.edit(guild.id, { SendMessages: null }, { reason: `Unlocked by ${interaction.user.tag}` });
        await lockdownRepo.delete(channel.id);
        unlockedChannels.push(`<#${channel.id}>`);
      } catch {
        failedChannels.push(`<#${channel.id}>`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🔓 Lockdown Lifted')
      .setColor(Colors.Green)
      .setDescription(`**${unlockedChannels.length}** channel(s) unlocked.`)
      .addFields(
        { name: 'Channels', value: unlockedChannels.join(', ') || 'None', inline: false },
        { name: 'Unlocked by', value: `${interaction.user.tag}`, inline: true }
      )
      .setTimestamp();

    if (failedChannels.length > 0) {
      embed.addFields({ name: 'Failed', value: failedChannels.join(', '), inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleStatus(interaction: CommandExecuteOptions['interaction']): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild!;
    const lockdowns = await lockdownRepo.getByGuild(guild.id);

    if (lockdowns.length === 0) {
      await interaction.editReply({ content: 'ℹ️ No channels are currently locked down.' });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔒 Active Lockdowns')
      .setColor(Colors.Orange)
      .setTimestamp();

    for (const ld of lockdowns) {
      const ch = guild.channels.cache.get(ld.channel_id);
      const channelName = ch ? `<#${ld.channel_id}>` : `Unknown (${ld.channel_id})`;
      const lockedBy = await guild.members.fetch(ld.locked_by).catch(() => null);
      const lockedByName = lockedBy ? lockedBy.user.tag : ld.locked_by;

      let value = `**Reason:** ${ld.reason}\n**Locked by:** ${lockedByName}\n**Since:** <t:${Math.floor(new Date(ld.created_at).getTime() / 1000)}:R>`;

      if (ld.unlock_at) {
        value += `\n**Auto-unlock:** <t:${Math.floor(new Date(ld.unlock_at).getTime() / 1000)}:R>`;
      }

      embed.addFields({ name: channelName, value, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  }
}
