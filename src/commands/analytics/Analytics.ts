import { SlashCommandBuilder, Colors, EmbedBuilder } from 'discord.js';
import { Command, type CommandExecuteOptions } from '../../structures/Command';
import {
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getYesterdayAnalytics,
  getAnalyticsRange,
} from '../../services/analytics/AnalyticsService';
import { logError } from '../../utils/logger';
import { GuildOnlyError, ValidationError } from '../../utils/errors';
import { AnalyticsSummary } from '../../database/schema';

function diffText(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0) return '= 0';
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

function buildAnalyticsEmbed(title: string, summary: AnalyticsSummary, yesterday?: AnalyticsSummary): EmbedBuilder {
  const fields = [
    { name: '💬 Messages', value: String(summary.messages_total), inline: true },
    { name: '🗑️ Messages Deleted', value: String(summary.messages_deleted), inline: true },
    { name: '📥 Members Joined', value: String(summary.members_joined), inline: true },
    { name: '📤 Members Left', value: String(summary.members_left), inline: true },
    { name: '🛡️ Moderation', value: String(summary.moderation_actions), inline: true },
    { name: '⚠️ Warnings', value: String(summary.warnings), inline: true },
    { name: '🔇 Timeouts', value: String(summary.timeouts), inline: true },
    { name: '🚪 Kicks', value: String(summary.kicks), inline: true },
    { name: '🔨 Bans', value: String(summary.bans), inline: true },
    { name: '🤖 AutoMod', value: String(summary.automod_actions), inline: true },
    { name: '🚀 Spam Detections', value: String(summary.spam_detections), inline: true },
    { name: '⚔️ Raid Detections', value: String(summary.raid_detections), inline: true },
    { name: '✅ Verification', value: String(summary.verification_events), inline: true },
    { name: '🔒 Quarantine', value: String(summary.quarantine_events), inline: true },
    { name: '🎫 Tickets Created', value: String(summary.tickets_created), inline: true },
    { name: '🎫 Tickets Closed', value: String(summary.tickets_closed), inline: true },
    { name: '📝 Applications', value: String(summary.applications_submitted), inline: true },
    { name: '✅ Approved', value: String(summary.applications_approved), inline: true },
    { name: '❌ Rejected', value: String(summary.applications_rejected), inline: true },
    { name: '🎉 Giveaways', value: String(summary.giveaways_created), inline: true },
    { name: '🎁 Giveaway Entries', value: String(summary.giveaway_entries), inline: true },
    { name: '📅 Events', value: String(summary.events_created), inline: true },
    { name: '👥 Event Participants', value: String(summary.event_participants), inline: true },
    { name: '📊 Polls', value: String(summary.polls_created), inline: true },
    { name: '🗳️ Poll Votes', value: String(summary.poll_votes), inline: true },
    { name: '⏰ Reminders', value: String(summary.reminders_created), inline: true },
    { name: '⭐ XP Awarded', value: String(summary.xp_awarded), inline: true },
  ];

  if (yesterday) {
    fields[0].name = `💬 Messages (${diffText(summary.messages_total, yesterday.messages_total)})`;
    fields[2].name = `📥 Joined (${diffText(summary.members_joined, yesterday.members_joined)})`;
    fields[3].name = `📤 Left (${diffText(summary.members_left, yesterday.members_left)})`;
  }

  return new EmbedBuilder()
    .setTitle(`📊 ${title}`)
    .setColor(Colors.Blue)
    .addFields(fields)
    .setTimestamp();
}

export default class AnalyticsCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('analytics')
    .setDescription('View server analytics')
    .setDefaultMemberPermissions(0)
    .addSubcommand(sub => sub
      .setName('overview')
      .setDescription("Today's analytics with yesterday comparison")
    )
    .addSubcommand(sub => sub
      .setName('daily')
      .setDescription('View daily analytics')
      .addStringOption(opt => opt.setName('date').setDescription('Date (YYYY-MM-DD)').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('weekly')
      .setDescription('View last 7 days analytics')
    )
    .addSubcommand(sub => sub
      .setName('monthly')
      .setDescription('View last 30 days analytics')
    )
    .addSubcommand(sub => sub
      .setName('range')
      .setDescription('View analytics for a date range')
      .addStringOption(opt => opt.setName('from').setDescription('Start date (YYYY-MM-DD)').setRequired(true))
      .addStringOption(opt => opt.setName('to').setDescription('End date (YYYY-MM-DD)').setRequired(true))
    );

  category = 'Utility';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guildId) throw new GuildOnlyError();
    const guildId = interaction.guildId;
    const hasManageGuild = interaction.memberPermissions?.has('ManageGuild') ?? false;

    if (!hasManageGuild) {
      throw new Error('Manage Server permission required to view analytics');
    }

    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'overview': {
          await interaction.deferReply();

          const todaySummary = await getDailyAnalytics(guildId);
          const yesterdaySummary = await getYesterdayAnalytics(guildId);

          const embed = buildAnalyticsEmbed('Today vs Yesterday', todaySummary, yesterdaySummary);
          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'daily': {
          await interaction.deferReply();

          const dateStr = interaction.options.getString('date') || undefined;
          if (dateStr && !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
          }

          const d = dateStr || new Date().toISOString().split('T')[0];
          const summary = await getDailyAnalytics(guildId, d);

          const embed = buildAnalyticsEmbed(`Daily Analytics — ${d}`, summary);
          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'weekly': {
          await interaction.deferReply();

          const summary = await getWeeklyAnalytics(guildId);
          const embed = buildAnalyticsEmbed('Last 7 Days Analytics', summary);
          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'monthly': {
          await interaction.deferReply();

          const summary = await getMonthlyAnalytics(guildId);
          const embed = buildAnalyticsEmbed('Last 30 Days Analytics', summary);
          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'range': {
          await interaction.deferReply();

          const from = interaction.options.getString('from', true);
          const to = interaction.options.getString('to', true);

          if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
            throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
          }

          if (new Date(from) > new Date(to)) {
            throw new ValidationError('Start date must be before end date');
          }

          const diffMs = new Date(to).getTime() - new Date(from).getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays > 365) {
            throw new ValidationError('Maximum range is 365 days');
          }

          if (new Date(to) > new Date()) {
            throw new ValidationError('End date cannot be in the future');
          }

          const summary = await getAnalyticsRange(guildId, from, to);
          const embed = buildAnalyticsEmbed(`Analytics: ${from} → ${to}`, summary);
          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      logError(`Error executing analytics command in guild ${guildId}`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const reply = { content: `❌ ${errorMessage}`, ephemeral: true };

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
}
