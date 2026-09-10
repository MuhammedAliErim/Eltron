import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, Colors, MessageFlags, TextChannel } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export default class PurgeCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages from a channel')
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Only delete messages from this user').setRequired(false),
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the purge').setRequired(false).setMaxLength(512),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

  category = 'Moderation';
  cooldown = 10;
  requiredPermissions = [PermissionFlagsBits.ManageMessages];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.channel as TextChannel;
    if (!channel || !channel.isTextBased()) {
      await interaction.editReply({ content: '❌ This command can only be used in text channels.' });
      return;
    }

    let deletedCount = 0;
    let lastMessageId: string | undefined;
    let remaining = amount;
    const cutoffTime = Date.now() - TWO_WEEKS_MS;
    let olderMessagesFound = false;

    while (remaining > 0) {
      const fetchLimit = Math.min(remaining, 100);
      const options: Record<string, number | string> = { limit: fetchLimit };
      if (lastMessageId) options.before = lastMessageId;

      try {
        const messages = await channel.messages.fetch(options as { limit: number; before?: string });

        if (messages.size === 0) break;

        const filtered = targetUser
          ? messages.filter((m) => m.author.id === targetUser.id)
          : messages;

        const deletable = filtered.filter((m) => {
          if (m.createdTimestamp < cutoffTime) {
            olderMessagesFound = true;
            return false;
          }
          return true;
        });

        if (deletable.size === 0) {
          lastMessageId = messages.last()?.id;
          if (!lastMessageId) break;
          continue;
        }

        const deleted = await channel.bulkDelete(deletable, true);
        deletedCount += deleted.size;
        remaining -= deleted.size;

        lastMessageId = messages.last()?.id;
        if (!lastMessageId) break;

        if (deleted.size < deletable.size) break;
      } catch {
        break;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Messages Purged')
      .setColor(Colors.Green)
      .setTimestamp();

    if (deletedCount > 0) {
      embed.setDescription(`Successfully deleted **${deletedCount}** message(s).`);
    } else {
      embed.setDescription('No messages were deleted.');
      embed.setColor(Colors.Greyple);
    }

    embed.addFields(
      { name: 'Channel', value: `<#${channel.id}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Reason', value: reason.substring(0, 1024), inline: false },
    );

    if (olderMessagesFound) {
      embed.setFooter({ text: '⚠️ Some messages could not be deleted because they are older than 14 days.' });
    }

    await interaction.editReply({ embeds: [embed] });
  }
}
