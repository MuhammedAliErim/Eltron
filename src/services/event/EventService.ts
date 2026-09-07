import { EmbedBuilder, APIEmbedField, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EventRepository } from '../../database/repositories/EventRepository';
import { EventCreate, EventType, EventRow, EventStatus, EventParticipantRow, EventWinnerRow } from '../../database/schema';
import { logger, logError } from '../../utils/logger';
import {
  MissingPermissionsError,
  ValidationError,
  DatabaseQueryError,
  BusinessRuleError,
} from '../../utils/errors';

const eventTimers = new Map<string, NodeJS.Timeout>();

const eventRepository = new EventRepository();

function getEventTypeEmoji(type: EventType): string {
  switch (type) {
    case 'GENERAL': return '📋';
    case 'COMPETITION': return '🏆';
    case 'TOURNAMENT': return '⚔️';
    case 'MEETING': return '🤝';
    case 'OTHER': return '📌';
  }
}

function getStatusEmoji(status: EventStatus): string {
  switch (status) {
    case 'UPCOMING': return '🕐';
    case 'ACTIVE': return '🟢';
    case 'ENDED': return '🔴';
    case 'CANCELLED': return '⛔';
  }
}

function getEventColor(status: EventStatus): number {
  switch (status) {
    case 'UPCOMING': return Colors.Blue;
    case 'ACTIVE': return Colors.Green;
    case 'ENDED': return Colors.Red;
    case 'CANCELLED': return Colors.Greyple;
  }
}

function validateEventDuration(startsAt: string, endsAt: string | null | undefined): void {
  if (endsAt && new Date(startsAt) >= new Date(endsAt)) {
    throw new ValidationError('Event must end after it starts');
  }
}

function validateMaxParticipants(value: number | undefined): void {
  if (value !== undefined && value !== null && value < 1) {
    throw new ValidationError('Max participants must be at least 1');
  }
}

export function buildEventEmbed(event: EventRow, participantCount: number): EmbedBuilder {
  const fields: APIEmbedField[] = [
    { name: '📋 Type', value: `\`${event.event_type}\``, inline: true },
    { name: '📊 Status', value: `${getStatusEmoji(event.status)} \`${event.status}\``, inline: true },
    { name: '🏷️ ID', value: `\`${event.id}\``, inline: true },
    { name: '📅 Start', value: `<t:${Math.floor(new Date(event.starts_at).getTime() / 1000)}:F>`, inline: true },
  ];

  if (event.ends_at) {
    fields.push({ name: '🏁 End', value: `<t:${Math.floor(new Date(event.ends_at).getTime() / 1000)}:F>`, inline: true });
  }

  fields.push({ name: '👤 Creator', value: `<@${event.creator_id}>`, inline: true });
  fields.push({
    name: '👥 Participants',
    value: event.max_participants
      ? `${participantCount} / ${event.max_participants}`
      : `${participantCount}`,
    inline: true,
  });

  return new EmbedBuilder()
    .setTitle(`${getEventTypeEmoji(event.event_type)} ${event.title}`)
    .setDescription(event.description || 'No description')
    .setColor(getEventColor(event.status))
    .addFields(fields)
    .setFooter({ text: `Event ID: ${event.id}` })
    .setTimestamp();
}

export function buildJoinLeaveButtons(eventId: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`event:join:${eventId}`)
        .setLabel('Katıl')
        .setEmoji('🟢')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`event:leave:${eventId}`)
        .setLabel('Ayrıl')
        .setEmoji('🔴')
        .setStyle(ButtonStyle.Danger)
    );
}

export interface CreateEventParams {
  guildId: string;
  channelId: string;
  creatorId: string;
  userBot?: boolean;
  hasManageGuild?: boolean;
  title: string;
  description?: string;
  type: EventType;
  startsAt: string;
  endsAt?: string;
  maxParticipants?: number;
}

export async function createEvent(params: CreateEventParams): Promise<EventRow> {
  if (params.userBot) {
    throw new MissingPermissionsError('Bots cannot create events');
  }

  if (!params.hasManageGuild) {
    throw new MissingPermissionsError('Manage Guild permission required to create events');
  }

  validateMaxParticipants(params.maxParticipants);
  validateEventDuration(params.startsAt, params.endsAt);

  const eventData: EventCreate = {
    guild_id: params.guildId,
    channel_id: params.channelId,
    creator_id: params.creatorId,
    title: params.title,
    description: params.description,
    event_type: params.type,
    starts_at: params.startsAt,
    ends_at: params.endsAt,
    max_participants: params.maxParticipants,
  };

  const event = await eventRepository.createEvent(eventData);

  logger.info({
    guildId: params.guildId,
    eventId: event.id,
    creatorId: params.creatorId,
    action: 'EVENT_CREATED',
  }, 'Event created');

  scheduleStartTimer(event);
  if (event.ends_at) {
    scheduleEndTimer(event);
  }

  return event;
}

export async function getEventById(eventId: number, guildId: string): Promise<EventRow> {
  const event = await eventRepository.getEvent(eventId);
  if (!event) {
    throw new BusinessRuleError('Event not found');
  }
  if (event.guild_id !== guildId) {
    throw new BusinessRuleError('Event not found');
  }
  return event;
}

export async function listEventsByGuild(
  guildId: string,
  status?: string
): Promise<EventRow[]> {
  return eventRepository.getEventsByGuild(guildId, status, 15);
}

export async function startEvent(
  eventId: number,
  guildId: string,
  userId: string,
  hasManageGuild: boolean,
  botOwners: string[]
): Promise<EventRow> {
  const event = await getEventById(eventId, guildId);

  if (event.status !== 'UPCOMING') {
    throw new BusinessRuleError('Only upcoming events can be started');
  }

  const isCreator = event.creator_id === userId;
  const isPrivileged = hasManageGuild || botOwners.includes(userId);

  if (!isCreator && !isPrivileged) {
    throw new MissingPermissionsError('Only the event creator or users with Manage Server can start this event');
  }

  const started = await eventRepository.startEvent(eventId);
  if (!started) {
    throw new BusinessRuleError('Event has already been started');
  }

  clearStartTimer(eventId);
  if (started.ends_at) {
    scheduleEndTimer({ ...started, ends_at: started.ends_at });
  }

  logger.info({
    guildId,
    eventId,
    userId,
    action: 'EVENT_STARTED',
  }, 'Event started');

  return started;
}

export async function endEvent(
  eventId: number,
  guildId: string,
  userId: string,
  hasManageGuild: boolean,
  botOwners: string[]
): Promise<EventRow> {
  const event = await getEventById(eventId, guildId);

  if (event.status !== 'ACTIVE') {
    throw new BusinessRuleError('Only active events can be ended');
  }

  const isCreator = event.creator_id === userId;
  const isPrivileged = hasManageGuild || botOwners.includes(userId);

  if (!isCreator && !isPrivileged) {
    throw new MissingPermissionsError('Only the event creator or users with Manage Server can end this event');
  }

  const ended = await eventRepository.endEvent(eventId);
  if (!ended) {
    throw new BusinessRuleError('Event has already been ended');
  }

  clearEndTimer(eventId);

  logger.info({
    guildId,
    eventId,
    userId,
    action: 'EVENT_ENDED',
  }, 'Event ended');

  return ended;
}

export async function cancelEvent(
  eventId: number,
  guildId: string,
  hasManageGuild: boolean
): Promise<EventRow> {
  if (!hasManageGuild) {
    throw new MissingPermissionsError('Manage Guild permission required to cancel events');
  }

  const event = await getEventById(eventId, guildId);

  if (event.status === 'ENDED' || event.status === 'CANCELLED') {
    throw new BusinessRuleError('Event is already ended or cancelled');
  }

  const cancelled = await eventRepository.cancelEvent(eventId);
  if (!cancelled) {
    throw new BusinessRuleError('Event has already been cancelled');
  }

  clearStartTimer(eventId);
  clearEndTimer(eventId);

  logger.info({
    guildId,
    eventId,
    action: 'EVENT_CANCELLED',
  }, 'Event cancelled');

  return cancelled;
}

export async function joinEvent(
  eventId: number,
  guildId: string,
  userId: string,
  userBot?: boolean
): Promise<{ event: EventRow; participantCount: number }> {
  if (userBot) {
    throw new MissingPermissionsError('Bots cannot join events');
  }

  const event = await getEventById(eventId, guildId);

  if (event.status === 'CANCELLED') {
    throw new BusinessRuleError('Cannot join a cancelled event');
  }

  if (event.status === 'ENDED') {
    throw new BusinessRuleError('Cannot join an ended event');
  }

  if (event.max_participants) {
    const currentCount = await eventRepository.countParticipants(eventId);
    if (currentCount >= event.max_participants) {
      throw new BusinessRuleError('Event has reached maximum participants');
    }
  }

  try {
    await eventRepository.addParticipant({
      event_id: eventId,
      guild_id: guildId,
      user_id: userId,
    });
  } catch (error) {
    if (
      error instanceof DatabaseQueryError &&
      error.message.includes('ALREADY_JOINED')
    ) {
      throw new BusinessRuleError('You have already joined this event');
    }
    throw error;
  }

  const participantCount = await eventRepository.countParticipants(eventId);

  logger.info({
    guildId,
    eventId,
    userId,
    action: 'EVENT_JOINED',
  }, 'Event joined');

  return { event, participantCount };
}

export async function leaveEvent(
  eventId: number,
  guildId: string,
  userId: string
): Promise<{ event: EventRow; participantCount: number }> {
  const event = await getEventById(eventId, guildId);

  const removed = await eventRepository.removeParticipant(eventId, userId);
  if (!removed) {
    throw new BusinessRuleError('You are not a participant of this event');
  }

  const participantCount = await eventRepository.countParticipants(eventId);

  logger.info({
    guildId,
    eventId,
    userId,
    action: 'EVENT_LEFT',
  }, 'Event left');

  return { event, participantCount };
}

export async function getEventParticipants(
  eventId: number,
  guildId: string
): Promise<EventParticipantRow[]> {
  await getEventById(eventId, guildId);
  return eventRepository.getParticipants(eventId);
}

export async function selectEventWinners(
  eventId: number,
  guildId: string,
  userId: string,
  count: number,
  hasManageGuild: boolean,
  botOwners: string[]
): Promise<EventWinnerRow[]> {
  const event = await getEventById(eventId, guildId);

  if (event.status !== 'ENDED') {
    throw new BusinessRuleError('Winners can only be selected after an event has ended');
  }

  const isCreator = event.creator_id === userId;
  const isPrivileged = hasManageGuild || botOwners.includes(userId);

  if (!isCreator && !isPrivileged) {
    throw new MissingPermissionsError('Only the event creator or users with Manage Server can select winners');
  }

  const participantCount = await eventRepository.countParticipants(eventId);
  const existingWinners = await eventRepository.getWinnerUserIds(eventId);

  const availableCount = participantCount - existingWinners.length;
  if (availableCount <= 0) {
    throw new BusinessRuleError('No eligible participants available for winner selection');
  }

  const actualCount = Math.min(count, availableCount);

  await eventRepository.clearWinners(eventId);

  const candidates = await eventRepository.getEligibleRerollCandidates(eventId);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, actualCount);

  const winners: EventWinnerRow[] = [];
  for (const winner of selected) {
    const winnerRow = await eventRepository.addWinner({
      event_id: eventId,
      guild_id: guildId,
      user_id: winner.user_id,
    });
    winners.push(winnerRow);
  }

  logger.info({
    guildId,
    eventId,
    userId,
    winnerCount: winners.length,
    action: 'EVENT_WINNERS_SELECTED',
  }, 'Event winners selected');

  return winners;
}

export async function rerollEventWinners(
  eventId: number,
  guildId: string,
  userId: string,
  count: number,
  hasManageGuild: boolean,
  botOwners: string[]
): Promise<EventWinnerRow[]> {
  const event = await getEventById(eventId, guildId);

  if (event.status !== 'ENDED') {
    throw new BusinessRuleError('Winners can only be rerolled after an event has ended');
  }

  const isCreator = event.creator_id === userId;
  const isPrivileged = hasManageGuild || botOwners.includes(userId);

  if (!isCreator && !isPrivileged) {
    throw new MissingPermissionsError('Only the event creator or users with Manage Server can reroll winners');
  }

  const participantCount = await eventRepository.countParticipants(eventId);
  const existingWinners = await eventRepository.getWinnerUserIds(eventId);

  const availableCount = participantCount - existingWinners.length;
  if (availableCount <= 0) {
    throw new BusinessRuleError('No eligible participants available for winner selection');
  }

  const actualCount = Math.min(count, availableCount);

  const candidates = await eventRepository.getEligibleRerollCandidates(eventId);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, actualCount);

  const winners: EventWinnerRow[] = [];
  for (const winner of selected) {
    const winnerRow = await eventRepository.addWinner({
      event_id: eventId,
      guild_id: guildId,
      user_id: winner.user_id,
    });
    winners.push(winnerRow);
  }

  logger.info({
    guildId,
    eventId,
    userId,
    winnerCount: winners.length,
    action: 'EVENT_REROLLED',
  }, 'Event winners rerolled');

  return winners;
}

function scheduleStartTimer(event: EventRow): void {
  const now = new Date();
  const startsAt = new Date(event.starts_at);
  const delay = startsAt.getTime() - now.getTime();

  if (delay <= 0) return;
  if (eventTimers.has(String(event.id))) return;

  const timer = setTimeout(async () => {
    try {
      const e = await eventRepository.getEvent(event.id);
      if (e && e.status === 'UPCOMING' && e.guild_id === event.guild_id) {
        await eventRepository.startEvent(event.id);
        logger.info({
          guildId: event.guild_id,
          eventId: event.id,
          action: 'EVENT_STARTED_BY_TIMER',
        }, 'Event started by timer');
        if (e.ends_at) {
          scheduleEndTimer({ ...e, status: 'ACTIVE' as EventStatus, ends_at: e.ends_at });
        }
      }
    } catch (err) {
      logError(`Error starting event ${event.id} via timer`, err);
    } finally {
      eventTimers.delete(String(event.id));
    }
  }, delay);

  timer.unref();
  eventTimers.set(String(event.id), timer);
}

function scheduleEndTimer(event: EventRow): void {
  if (!event.ends_at) return;
  const now = new Date();
  const endsAt = new Date(event.ends_at);
  const delay = endsAt.getTime() - now.getTime();

  if (delay <= 0) return;
  const key = `end:${event.id}`;
  if (eventTimers.has(key)) return;

  const timer = setTimeout(async () => {
    try {
      const e = await eventRepository.getEvent(event.id);
      if (e && e.status === 'ACTIVE' && e.guild_id === event.guild_id) {
        await eventRepository.endEvent(event.id);
        logger.info({
          guildId: event.guild_id,
          eventId: event.id,
          action: 'EVENT_ENDED_BY_TIMER',
        }, 'Event ended by timer');
      }
    } catch (err) {
      logError(`Error ending event ${event.id} via timer`, err);
    } finally {
      eventTimers.delete(key);
    }
  }, delay);

  timer.unref();
  eventTimers.set(key, timer);
}

function clearStartTimer(eventId: number): void {
  const key = String(eventId);
  if (eventTimers.has(key)) {
    clearTimeout(eventTimers.get(key)!);
    eventTimers.delete(key);
  }
}

function clearEndTimer(eventId: number): void {
  const key = `end:${eventId}`;
  if (eventTimers.has(key)) {
    clearTimeout(eventTimers.get(key)!);
    eventTimers.delete(key);
  }
}

export async function restoreEventTimers(): Promise<void> {
  try {
    const events = await eventRepository.getActiveAndUpcomingEvents();
    const now = new Date();

    for (const event of events) {
      const startsAt = new Date(event.starts_at);

      if (event.status === 'UPCOMING' && startsAt <= now) {
        const transitioned = await eventRepository.startEvent(event.id);
        if (transitioned && transitioned.ends_at) {
          scheduleEndTimer({ ...transitioned, ends_at: transitioned.ends_at });
        }
        continue;
      }

      if (event.status === 'UPCOMING' && startsAt > now) {
        scheduleStartTimer(event);
        continue;
      }

      if (event.status === 'ACTIVE' && event.ends_at) {
        const endsAt = new Date(event.ends_at);
        if (endsAt <= now) {
          await eventRepository.endEvent(event.id);
          logger.info({
            guildId: event.guild_id,
            eventId: event.id,
            action: 'EVENT_ENDED_ON_RESTORE',
          }, 'Event ended on restore');
        } else {
          scheduleEndTimer({ ...event, ends_at: event.ends_at });
        }
      }
    }
  } catch (error) {
    logError('Error restoring event timers', error);
  }
}
