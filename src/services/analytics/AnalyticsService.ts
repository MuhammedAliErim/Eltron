import { AnalyticsRepository } from '../../database/repositories/AnalyticsRepository';
import { AnalyticsSummary } from '../../database/schema';
import { logError } from '../../utils/logger';

const analyticsRepository = new AnalyticsRepository();

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

async function safeIncrement(guildId: string, metric: string, amount: number = 1): Promise<void> {
  try {
    await analyticsRepository.incrementMetric(guildId, today(), metric as never, amount);
  } catch (error) {
    logError(`Analytics increment failed: ${metric}`, error);
  }
}

export async function recordMessage(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'messages_total');
}

export async function recordMessageDeleted(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'messages_deleted');
}

export async function recordMemberJoin(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'members_joined');
}

export async function recordMemberLeave(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'members_left');
}

export async function recordModerationAction(guildId: string, type: string): Promise<void> {
  await safeIncrement(guildId, 'moderation_actions');
  switch (type) {
    case 'WARN': await safeIncrement(guildId, 'warnings'); break;
    case 'TIMEOUT': await safeIncrement(guildId, 'timeouts'); break;
    case 'KICK': await safeIncrement(guildId, 'kicks'); break;
    case 'BAN': await safeIncrement(guildId, 'bans'); break;
  }
}

export async function recordAutomodAction(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'automod_actions');
}

export async function recordSpamDetection(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'spam_detections');
}

export async function recordRaidDetection(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'raid_detections');
}

export async function recordVerificationEvent(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'verification_events');
}

export async function recordQuarantineEvent(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'quarantine_events');
}

export async function recordTicketCreated(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'tickets_created');
}

export async function recordTicketClosed(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'tickets_closed');
}

export async function recordApplicationSubmitted(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'applications_submitted');
}

export async function recordApplicationApproved(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'applications_approved');
}

export async function recordApplicationRejected(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'applications_rejected');
}

export async function recordGiveawayCreated(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'giveaways_created');
}

export async function recordGiveawayEntry(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'giveaway_entries');
}

export async function recordEventCreated(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'events_created');
}

export async function recordEventParticipant(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'event_participants');
}

export async function recordPollCreated(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'polls_created');
}

export async function recordPollVote(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'poll_votes');
}

export async function recordReminderCreated(guildId: string): Promise<void> {
  await safeIncrement(guildId, 'reminders_created');
}

export async function recordXpAwarded(guildId: string, amount: number): Promise<void> {
  await safeIncrement(guildId, 'xp_awarded', amount);
}

export async function getDailyAnalytics(guildId: string, date?: string): Promise<AnalyticsSummary> {
  const d = date || today();
  return analyticsRepository.getSummary(guildId, d, d);
}

export async function getAnalyticsRange(
  guildId: string,
  fromDate: string,
  toDate: string
): Promise<AnalyticsSummary> {
  return analyticsRepository.getSummary(guildId, fromDate, toDate);
}

export async function getWeeklyAnalytics(guildId: string): Promise<AnalyticsSummary> {
  return analyticsRepository.getSummary(guildId, daysAgo(6), today());
}

export async function getMonthlyAnalytics(guildId: string): Promise<AnalyticsSummary> {
  return analyticsRepository.getSummary(guildId, daysAgo(29), today());
}

export async function getYesterdayAnalytics(guildId: string): Promise<AnalyticsSummary> {
  return analyticsRepository.getSummary(guildId, daysAgo(1), daysAgo(1));
}

export { analyticsRepository };
