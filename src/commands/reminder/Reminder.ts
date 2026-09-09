import { SlashCommandBuilder, Colors, EmbedBuilder, APIEmbedField, MessageFlags } from 'discord.js';
import { Command, type CommandExecuteOptions } from '../../structures/Command';
import {
  createReminder,
  getReminderById,
  listUserReminders,
  cancelReminder,
  parseReminderDuration,
} from '../../services/reminder/ReminderService';
import { logError } from '../../utils/logger';
import { GuildOnlyError, ValidationError } from '../../utils/errors';

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'PENDING': return '🟢';
    case 'TRIGGERED': return '✅';
    case 'CANCELLED': return '⛔';
    default: return '❓';
  }
}

export default class ReminderCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Manage your reminders')
    .setDefaultMemberPermissions(0)
    .addSubcommand(sub => sub
      .setName('set')
      .setDescription('Set a new reminder')
      .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 30m, 2h, 7d)').setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('Reminder message').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List your active reminders')
    )
    .addSubcommand(sub => sub
      .setName('info')
      .setDescription('Get reminder details')
      .addIntegerOption(opt => opt.setName('id').setDescription('Reminder ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('cancel')
      .setDescription('Cancel a reminder')
      .addIntegerOption(opt => opt.setName('id').setDescription('Reminder ID').setRequired(true))
    );

  category = 'Utility';
  cooldown = 3;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guildId) throw new GuildOnlyError();
    const guildId = interaction.guildId;

    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'set': {
          await interaction.deferReply();

          const durationRaw = interaction.options.getString('duration', true);
          const message = interaction.options.getString('message', true);

          const durationMs = parseReminderDuration(durationRaw);
          if (durationMs === null) {
            throw new ValidationError('Invalid duration format. Use: 10s, 30m, 1h, 7d, 1w');
          }

          const reminder = await createReminder({
            guildId,
            channelId: interaction.channelId,
            userId: interaction.user.id,
            userBot: interaction.user.bot,
            message,
            durationMs,
          });

          const embed = new EmbedBuilder()
            .setTitle('⏰ Reminder Set')
            .setDescription(`I'll remind you <t:${Math.floor(new Date(reminder.remind_at).getTime() / 1000)}:R>`)
            .addFields(
              { name: 'Message', value: message.substring(0, 1024) },
              { name: 'ID', value: String(reminder.id), inline: true },
            )
            .setColor(Colors.Green)
            .setFooter({ text: `Reminder #${reminder.id}` })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'list': {
          await interaction.deferReply();

          const reminders = await listUserReminders(interaction.user.id, guildId);

          if (reminders.length === 0) {
            const embed = new EmbedBuilder()
              .setTitle('⏰ Your Reminders')
              .setDescription('You have no active reminders.')
              .setColor(Colors.Greyple);
            await interaction.editReply({ embeds: [embed] });
            return;
          }

          const fields: APIEmbedField[] = reminders.map(r => ({
            name: `#${r.id} — ${getStatusEmoji(r.status)}`,
            value: `> ${r.message.substring(0, 100)}\n<t:${Math.floor(new Date(r.remind_at).getTime() / 1000)}:F> (<t:${Math.floor(new Date(r.remind_at).getTime() / 1000)}:R>)`,
            inline: false,
          }));

          const embed = new EmbedBuilder()
            .setTitle('⏰ Your Reminders')
            .setColor(Colors.Blue)
            .addFields(fields)
            .setFooter({ text: `Total: ${reminders.length} reminder(s)` });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'info': {
          await interaction.deferReply();

          const id = interaction.options.getInteger('id', true);
          const reminder = await getReminderById(id, interaction.user.id);

          const embed = new EmbedBuilder()
            .setTitle(`⏰ Reminder #${reminder.id}`)
            .addFields(
              { name: 'Message', value: reminder.message.substring(0, 1024) },
              { name: 'Status', value: `${getStatusEmoji(reminder.status)} ${reminder.status}`, inline: true },
              { name: 'Remind At', value: `<t:${Math.floor(new Date(reminder.remind_at).getTime() / 1000)}:F>`, inline: true },
              { name: 'Created', value: `<t:${Math.floor(new Date(reminder.created_at).getTime() / 1000)}:R>`, inline: true },
              { name: 'Channel', value: `<#${reminder.channel_id}>`, inline: true },
            )
            .setColor(Colors.Blue)
            .setFooter({ text: `Reminder #${reminder.id}` })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'cancel': {
          await interaction.deferReply();

          const id = interaction.options.getInteger('id', true);
          await cancelReminder(id, interaction.user.id);

          const embed = new EmbedBuilder()
            .setTitle('⏰ Reminder Cancelled')
            .setDescription(`Reminder #${id} has been cancelled.`)
            .setColor(Colors.Greyple);

          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      logError(`Error executing reminder command in guild ${guildId}`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const reply = { content: `❌ ${errorMessage}`, flags: MessageFlags.Ephemeral };

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
}
