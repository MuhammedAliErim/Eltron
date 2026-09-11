import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, Colors, ChannelType } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class CloneChannelCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('clonechannel')
    .setDescription('Clone a channel with its permissions')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to clone (defaults to current)').setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement)
    )
    .addStringOption(opt =>
      opt.setName('name').setDescription('Name for the cloned channel').setRequired(false).setMaxLength(100)
    )
    .addBooleanOption(opt =>
      opt.setName('with_permissions').setDescription('Copy permissions (default: true)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

  category = 'Moderation';
  cooldown = 10;
  requiredPermissions = [PermissionFlagsBits.ManageChannels];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const channelOption = interaction.options.getChannel('channel');
    const sourceChannel = channelOption
      ? await interaction.guild.channels.fetch(channelOption.id)
      : interaction.channel;

    if (!sourceChannel || !sourceChannel.isTextBased()) {
      await interaction.reply({ content: '❌ Invalid source channel.', flags: MessageFlags.Ephemeral });
      return;
    }

    const name = interaction.options.getString('name') || sourceChannel.name;
    const withPermissions = interaction.options.getBoolean('with_permissions') ?? true;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const cloneOptions: Record<string, unknown> = { name };
      if (!withPermissions) {
        cloneOptions.permissionOverwrites = [];
      }

      const cloned = await sourceChannel.clone(cloneOptions);

      if ('setPosition' in sourceChannel) {
        await cloned.setPosition(sourceChannel.position);
      }

      const embed = new EmbedBuilder()
        .setTitle('✅ Channel Cloned')
        .setColor(Colors.Green)
        .addFields(
          { name: 'Original', value: `<#${sourceChannel.id}>`, inline: true },
          { name: 'Cloned', value: `<#${cloned.id}>`, inline: true },
          { name: 'Permissions', value: withPermissions ? 'Copied' : 'Not copied', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to clone channel: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
}
