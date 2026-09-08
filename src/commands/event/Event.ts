import { SlashCommandBuilder, Colors, EmbedBuilder, APIEmbedField } from 'discord.js';
import { Command, type CommandExecuteOptions } from '../../structures/Command';
import {
  createEvent,
  getEventById,
  listEventsByGuild,
  startEvent,
  endEvent,
  cancelEvent,
  joinEvent,
  leaveEvent,
  getEventParticipants,
  selectEventWinners,
  rerollEventWinners,
  buildEventEmbed,
  buildJoinLeaveButtons,
} from '../../services/event/EventService';
import { BOT_OWNERS } from '../../config/bot';
import { logError } from '../../utils/logger';
import { MissingPermissionsError, BusinessRuleError, GuildOnlyError, ValidationError } from '../../utils/errors';
import { EventType } from '../../database/schema';

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'UPCOMING': return '🕐';
    case 'ACTIVE': return '🟢';
    case 'ENDED': return '🔴';
    case 'CANCELLED': return '⛔';
    default: return '❓';
  }
}

function getEventTypeEmoji(type: string): string {
  switch (type) {
    case 'GENERAL': return '📋';
    case 'COMPETITION': return '🏆';
    case 'TOURNAMENT': return '⚔️';
    case 'MEETING': return '🤝';
    case 'OTHER': return '📌';
    default: return '❓';
  }
}

export default class EventCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('event')
    .setDescription('Manage server events')
    .setDefaultMemberPermissions(0)
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a new event')
      .addStringOption(opt => opt.setName('title').setDescription('Event title').setRequired(true))
      .addStringOption(opt => opt
        .setName('type')
        .setDescription('Event type')
        .setRequired(true)
        .addChoices(
          { name: 'General', value: 'GENERAL' },
          { name: 'Competition', value: 'COMPETITION' },
          { name: 'Tournament', value: 'TOURNAMENT' },
          { name: 'Meeting', value: 'MEETING' },
          { name: 'Other', value: 'OTHER' },
        ))
      .addStringOption(opt => opt.setName('start').setDescription('Start time (ISO 8601)').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Event description').setRequired(false))
      .addStringOption(opt => opt.setName('end').setDescription('End time (ISO 8601)').setRequired(false))
      .addIntegerOption(opt => opt.setName('max_participants').setDescription('Max participants').setMinValue(1))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List events')
      .addStringOption(opt => opt
        .setName('status')
        .setDescription('Filter by status')
        .addChoices(
          { name: 'Upcoming', value: 'UPCOMING' },
          { name: 'Active', value: 'ACTIVE' },
          { name: 'Ended', value: 'ENDED' },
          { name: 'Cancelled', value: 'CANCELLED' },
        ))
    )
    .addSubcommand(sub => sub
      .setName('info')
      .setDescription('Get event details')
      .addIntegerOption(opt => opt.setName('id').setDescription('Event ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('start')
      .setDescription('Start an event')
      .addIntegerOption(opt => opt.setName('id').setDescription('Event ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('end')
      .setDescription('End an event')
      .addIntegerOption(opt => opt.setName('id').setDescription('Event ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('cancel')
      .setDescription('Cancel an event')
      .addIntegerOption(opt => opt.setName('id').setDescription('Event ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('join')
      .setDescription('Join an event')
      .addIntegerOption(opt => opt.setName('id').setDescription('Event ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('leave')
      .setDescription('Leave an event')
      .addIntegerOption(opt => opt.setName('id').setDescription('Event ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('participants')
      .setDescription('List event participants')
      .addIntegerOption(opt => opt.setName('id').setDescription('Event ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('winners')
      .setDescription('View or select event winners')
      .addIntegerOption(opt => opt.setName('id').setDescription('Event ID').setRequired(true))
      .addIntegerOption(opt => opt.setName('count').setDescription('Number of winners to select').setMinValue(1))
    )
    .addSubcommand(sub => sub
      .setName('reroll')
      .setDescription('Reroll event winners')
      .addIntegerOption(opt => opt.setName('id').setDescription('Event ID').setRequired(true))
      .addIntegerOption(opt => opt.setName('count').setDescription('Number of winners to reroll').setMinValue(1))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- discord.js builder pattern limitation
    ) as any;

  cooldown = 0;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    try {
      if (!interaction.guildId) {
        throw new GuildOnlyError('This command can only be used in a server');
      }

      const subcommand = interaction.options.getSubcommand();
      const guildId = interaction.guildId;
      const userId = interaction.user.id;
      const isBot = interaction.user.bot;
      const hasManageGuild = interaction.memberPermissions?.has('ManageGuild') ?? false;

      switch (subcommand) {
        case 'create': {
          const title = interaction.options.getString('title', true);
          const description = interaction.options.getString('description') || undefined;
          const type = interaction.options.getString('type', true) as EventType;
          const startsAt = interaction.options.getString('start', true);
          const endsAt = interaction.options.getString('end') || undefined;
          const maxParticipants = interaction.options.getInteger('max_participants') || undefined;

          const event = await createEvent({
            guildId,
            channelId: interaction.channelId,
            creatorId: userId,
            userBot: isBot,
            hasManageGuild,
            title,
            description,
            type,
            startsAt,
            endsAt,
            maxParticipants,
          });

          const embed = buildEventEmbed(event, 0);
          const row = buildJoinLeaveButtons(event.id);

          await interaction.reply({
            content: `✅ Event **${title}** created!`,
            embeds: [embed],
            components: [row],
          });
          break;
        }

        case 'list': {
          const status = interaction.options.getString('status') || undefined;
          const events = await listEventsByGuild(guildId, status);

          if (events.length === 0) {
            await interaction.reply({ content: '📭 No events found', ephemeral: true });
            return;
          }

          const fields: APIEmbedField[] = events.map((e) => ({
            name: `${getEventTypeEmoji(e.event_type)} ${e.title}`,
            value: `ID: \`${e.id}\` | Status: ${getStatusEmoji(e.status)} \`${e.status}\` | Starts: <t:${Math.floor(new Date(e.starts_at).getTime() / 1000)}:R>`,
            inline: false,
          }));

          const embed = new EmbedBuilder()
            .setTitle('📋 Server Events')
            .setDescription(status ? `Filtered by: \`${status}\`` : 'All events')
            .setColor(Colors.Blue)
            .addFields(fields)
            .setFooter({ text: `${events.length} event(s)` })
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'info': {
          const eventId = interaction.options.getInteger('id', true);
          const event = await getEventById(eventId, guildId);
          const participants = await getEventParticipants(eventId, guildId);
          const embed = buildEventEmbed(event, participants.length);
          const row = buildJoinLeaveButtons(event.id);

          await interaction.reply({ embeds: [embed], components: [row] });
          break;
        }

        case 'start': {
          const eventId = interaction.options.getInteger('id', true);
          const event = await startEvent(eventId, guildId, userId, hasManageGuild, BOT_OWNERS);

          await interaction.reply({ content: `🟢 Event **${event.title}** has been started!` });
          break;
        }

        case 'end': {
          const eventId = interaction.options.getInteger('id', true);
          const event = await endEvent(eventId, guildId, userId, hasManageGuild, BOT_OWNERS);

          await interaction.reply({ content: `🔴 Event **${event.title}** has been ended!` });
          break;
        }

        case 'cancel': {
          const eventId = interaction.options.getInteger('id', true);
          const event = await cancelEvent(eventId, guildId, hasManageGuild);

          await interaction.reply({ content: `⛔ Event **${event.title}** has been cancelled!` });
          break;
        }

        case 'join': {
          const eventId = interaction.options.getInteger('id', true);
          const { event, participantCount } = await joinEvent(eventId, guildId, userId, isBot);

          const embed = buildEventEmbed(event, participantCount);
          const row = buildJoinLeaveButtons(event.id);

          await interaction.reply({
            content: `✅ You've joined **${event.title}**!`,
            embeds: [embed],
            components: [row],
          });
          break;
        }

        case 'leave': {
          const eventId = interaction.options.getInteger('id', true);
          const { event, participantCount } = await leaveEvent(eventId, guildId, userId);

          const embed = buildEventEmbed(event, participantCount);
          const row = buildJoinLeaveButtons(event.id);

          await interaction.reply({
            content: `👋 You've left **${event.title}**`,
            embeds: [embed],
            components: [row],
          });
          break;
        }

        case 'participants': {
          const eventId = interaction.options.getInteger('id', true);
          await getEventById(eventId, guildId);
          const participants = await getEventParticipants(eventId, guildId);

          if (participants.length === 0) {
            await interaction.reply({ content: '📭 No participants yet', ephemeral: true });
            return;
          }

          const participantList = participants
            .slice(0, 25)
            .map((p, i) => `${i + 1}. <@${p.user_id}> — <t:${Math.floor(new Date(p.joined_at).getTime() / 1000)}:R>`)
            .join('\n');

          const embed = new EmbedBuilder()
            .setTitle('👥 Event Participants')
            .setDescription(participantList)
            .setColor(Colors.Blue)
            .setFooter({ text: `${participants.length} total participant(s)` })
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'winners': {
          const eventId = interaction.options.getInteger('id', true);
          const count = interaction.options.getInteger('count');

          if (count) {
            const winners = await selectEventWinners(eventId, guildId, userId, count, hasManageGuild, BOT_OWNERS);

            if (winners.length === 0) {
              await interaction.reply({ content: '❌ No eligible participants available', ephemeral: true });
              return;
            }

            const winnerList = winners.map((w, i) => `${i + 1}. <@${w.user_id}>`).join('\n');

            const embed = new EmbedBuilder()
              .setTitle('🏆 Event Winners Selected!')
              .setDescription(winnerList)
              .setColor(Colors.Gold)
              .setFooter({ text: `${winners.length} winner(s) selected` })
              .setTimestamp();

            await interaction.reply({ embeds: [embed] });
          } else {
            const event = await getEventById(eventId, guildId);

            if (event.status !== 'ENDED') {
              await interaction.reply({ content: '❌ Event must be ended before viewing winners', ephemeral: true });
              return;
            }

            const participants = await getEventParticipants(eventId, guildId);
            const embed = buildEventEmbed(event, participants.length);

            await interaction.reply({
              content: 'ℹ️ Use `/event winners id:<count>` to select winners',
              embeds: [embed],
            });
          }
          break;
        }

        case 'reroll': {
          const eventId = interaction.options.getInteger('id', true);
          const count = interaction.options.getInteger('count') || 1;

          const winners = await rerollEventWinners(eventId, guildId, userId, count, hasManageGuild, BOT_OWNERS);

          if (winners.length === 0) {
            await interaction.reply({ content: '❌ No eligible participants available for reroll', ephemeral: true });
            return;
          }

          const winnerList = winners.map((w, i) => `${i + 1}. <@${w.user_id}>`).join('\n');

          const embed = new EmbedBuilder()
            .setTitle('🔄 Event Winners Rerolled!')
            .setDescription(winnerList)
            .setColor(Colors.Gold)
            .setFooter({ text: `${winners.length} new winner(s) selected` })
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      if (error instanceof MissingPermissionsError || error instanceof BusinessRuleError || error instanceof GuildOnlyError || error instanceof ValidationError) {
        await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
      } else {
        logError('Error in /event command', error);
        await interaction.reply({ content: '❌ An unexpected error occurred', ephemeral: true });
      }
    }
  }
}
