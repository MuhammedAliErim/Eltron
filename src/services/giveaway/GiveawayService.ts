import {
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type TextChannel,
  type Client,
  type GuildMember,
  PermissionFlagsBits,
} from 'discord.js';
import { GiveawayRepository } from '../../database/repositories/GiveawayRepository';
import { LevelRepository } from '../../database/repositories/LevelRepository';
import { GiveawayRow, GiveawayWinnerRow } from '../../database/schema';
import { logger } from '../../utils/logger';

export const MIN_DURATION_SECONDS = 10;
export const MAX_DURATION_SECONDS = 30 * 24 * 60 * 60;
export const MIN_WINNERS = 1;
export const MAX_WINNERS = 100;
export const MAX_PRIZE_LENGTH = 256;
export const MAX_DESCRIPTION_LENGTH = 1024;

const giveawayTimers = new Map<number, ReturnType<typeof setTimeout>>();

export function parseDurationToMs(duration: string): number | null {
  const regex = /^(\d+)\s*(s|m|h|d)$/i;
  const match = duration.match(regex);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

export function validateGiveawayParams(
  durationMs: number,
  winnerCount: number,
  prize: string
): { valid: boolean; error?: string } {
  const durationSeconds = Math.floor(durationMs / 1000);
  if (durationSeconds < MIN_DURATION_SECONDS) {
    return { valid: false, error: `Duration must be at least ${MIN_DURATION_SECONDS} seconds.` };
  }
  if (durationSeconds > MAX_DURATION_SECONDS) {
    return { valid: false, error: `Duration cannot exceed 30 days.` };
  }

  if (winnerCount < MIN_WINNERS || winnerCount > MAX_WINNERS) {
    return { valid: false, error: `Winner count must be between ${MIN_WINNERS} and ${MAX_WINNERS}.` };
  }

  if (!prize || prize.trim().length === 0) {
    return { valid: false, error: 'Prize cannot be empty.' };
  }

  if (prize.length > MAX_PRIZE_LENGTH) {
    return { valid: false, error: `Prize cannot exceed ${MAX_PRIZE_LENGTH} characters.` };
  }

  return { valid: true };
}

export function createGiveawayEmbed(
  giveaway: GiveawayRow,
  entryCount: number
): EmbedBuilder {
  const endsAtTimestamp = Math.floor(new Date(giveaway.ends_at).getTime() / 1000);
  const isActive = giveaway.status === 'ACTIVE';
  const isEnded = giveaway.status === 'ENDED';
  const isCancelled = giveaway.status === 'CANCELLED';

  let color: number = Colors.Gold;
  let statusText = `Ends <t:${endsAtTimestamp}:R>`;

  if (isEnded) {
    color = Colors.Greyple;
    statusText = 'Ended';
  } else if (isCancelled) {
    color = Colors.Red;
    statusText = 'Cancelled';
  }

  const embed = new EmbedBuilder()
    .setTitle(giveaway.prize)
    .setColor(color)
    .addFields(
      { name: 'Winners', value: String(giveaway.winner_count), inline: true },
      { name: 'Entries', value: String(entryCount), inline: true },
      { name: 'Host', value: `<@${giveaway.host_id}>`, inline: true },
    )
    .setFooter({ text: `Giveaway ID: ${giveaway.id}` })
    .setTimestamp(new Date(giveaway.created_at));

  if (giveaway.description) {
    embed.setDescription(giveaway.description);
  }

  if (isActive) {
    embed.addFields({ name: 'Time Remaining', value: `<t:${endsAtTimestamp}:R>`, inline: false });
  } else if (isEnded) {
    embed.addFields({ name: 'Status', value: statusText, inline: false });
  } else if (isCancelled) {
    embed.addFields({ name: 'Status', value: statusText, inline: false });
  }

  return embed;
}

export function createGiveawayButton(giveawayId: number, isActive: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway:join:${giveawayId}`)
      .setLabel(isActive ? 'Enter Giveaway' : 'Giveaway Ended')
      .setStyle(isActive ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!isActive)
  );
}

export function buildWinnersString(winners: GiveawayWinnerRow[]): string {
  if (winners.length === 0) return 'No winners';
  return winners.map((w) => `<@${w.user_id}>`).join(', ');
}

export async function joinGiveaway(
  giveawayId: number,
  guildId: string,
  userId: string,
  repo: GiveawayRepository,
  client?: Client
): Promise<{ success: boolean; message: string; entryCount: number }> {
  const giveaway = await repo.getGiveaway(giveawayId);
  if (!giveaway) {
    return { success: false, message: 'Giveaway not found.', entryCount: 0 };
  }

  if (giveaway.guild_id !== guildId) {
    return { success: false, message: 'Giveaway not found in this server.', entryCount: 0 };
  }

  if (giveaway.status !== 'ACTIVE') {
    return { success: false, message: 'This giveaway has ended.', entryCount: 0 };
  }

  const now = new Date();
  if (now >= new Date(giveaway.ends_at)) {
    return { success: false, message: 'This giveaway has ended.', entryCount: 0 };
  }

  if (giveaway.required_role_id && client) {
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      if (!member.roles.cache.has(giveaway.required_role_id)) {
        return { success: false, message: `You need the <@&${giveaway.required_role_id}> role to enter this giveaway.`, entryCount: 0 };
      }
    } catch {
      return { success: false, message: 'Could not verify your roles.', entryCount: 0 };
    }
  }

  if (giveaway.required_level > 0) {
    try {
      const levelRepo = new LevelRepository();
      const userXP = await levelRepo.getUserXP(guildId, userId);
      if (!userXP || userXP.level < giveaway.required_level) {
        return { success: false, message: `You need to be at least level ${giveaway.required_level} to enter this giveaway.`, entryCount: 0 };
      }
    } catch {
      return { success: false, message: 'Could not verify your level.', entryCount: 0 };
    }
  }

  if (giveaway.max_entries > 0) {
    const currentCount = await repo.countEntries(giveawayId);
    if (currentCount >= giveaway.max_entries) {
      return { success: false, message: 'This giveaway has reached its maximum number of entries.', entryCount: currentCount };
    }
  }

  try {
    await repo.addEntry({
      giveaway_id: giveawayId,
      guild_id: guildId,
      user_id: userId,
    });

    const entryCount = await repo.countEntries(giveawayId);
    return { success: true, message: 'You have entered the giveaway!', entryCount };
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_JOINED') {
      const entryCount = await repo.countEntries(giveawayId);
      return { success: false, message: 'You have already entered this giveaway.', entryCount };
    }
    throw error;
  }
}

export async function leaveGiveaway(
  giveawayId: number,
  guildId: string,
  userId: string,
  repo: GiveawayRepository
): Promise<{ success: boolean; message: string; entryCount: number }> {
  const giveaway = await repo.getGiveaway(giveawayId);
  if (!giveaway) {
    return { success: false, message: 'Giveaway not found.', entryCount: 0 };
  }

  if (giveaway.guild_id !== guildId) {
    return { success: false, message: 'Giveaway not found in this server.', entryCount: 0 };
  }

  const removed = await repo.removeEntry(giveawayId, userId);
  const entryCount = await repo.countEntries(giveawayId);

  if (!removed) {
    return { success: false, message: 'You are not entered in this giveaway.', entryCount };
  }

  return { success: true, message: 'You have left the giveaway.', entryCount };
}

export async function selectWinners(
  entries: { user_id: string }[],
  winnerCount: number
): Promise<string[]> {
  if (entries.length === 0) return [];

  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  const uniqueWinnerCount = Math.min(winnerCount, shuffled.length);
  const winners = shuffled.slice(0, uniqueWinnerCount);
  return winners.map((w) => w.user_id);
}

export async function endGiveaway(
  giveawayId: number,
  repo: GiveawayRepository,
  client?: Client
): Promise<{ giveaway: GiveawayRow | null; winners: GiveawayWinnerRow[]; message: string }> {
  const giveaway = await repo.getGiveaway(giveawayId);
  if (!giveaway) {
    return { giveaway: null, winners: [], message: 'Giveaway not found.' };
  }

  if (giveaway.status !== 'ACTIVE') {
    return { giveaway, winners: [], message: `Giveaway is already ${giveaway.status.toLowerCase()}.` };
  }

  const ended = await repo.endGiveaway(giveawayId);
  if (!ended) {
    return { giveaway: null, winners: [], message: 'Failed to end giveaway.' };
  }

  const entries = await repo.getEntries(giveawayId);
  const winnerUserIds = await selectWinners(entries, giveaway.winner_count);

  const winners: GiveawayWinnerRow[] = [];
  for (const userId of winnerUserIds) {
    try {
      const winner = await repo.createWinner({
        giveaway_id: giveawayId,
        guild_id: giveaway.guild_id,
        user_id: userId,
        reroll_number: 0,
      });
      winners.push(winner);
    } catch (error) {
      if (error instanceof Error && error.message === 'ALREADY_WON') continue;
      throw error;
    }
  }

  clearGiveawayTimer(giveawayId);

  if (client) {
    await updateGiveawayMessage(client, ended, winners, entries.length);
    await announceWinners(client, ended, winners);
  }

  const winnersStr = buildWinnersString(winners);
  const message = winners.length > 0
    ? `Giveaway ended! Winners: ${winnersStr}`
    : 'Giveaway ended! No entries.';

  logger.info({
    giveawayId,
    guildId: giveaway.guild_id,
    winnerCount: winners.length,
    entryCount: entries.length,
  }, 'Giveaway ended');

  return { giveaway: ended, winners, message };
}

export async function cancelGiveaway(
  giveawayId: number,
  repo: GiveawayRepository,
  client?: Client
): Promise<{ giveaway: GiveawayRow | null; message: string }> {
  const giveaway = await repo.getGiveaway(giveawayId);
  if (!giveaway) {
    return { giveaway: null, message: 'Giveaway not found.' };
  }

  if (giveaway.status !== 'ACTIVE') {
    return { giveaway, message: `Giveaway is already ${giveaway.status.toLowerCase()}.` };
  }

  const cancelled = await repo.cancelGiveaway(giveawayId);
  if (!cancelled) {
    return { giveaway: null, message: 'Failed to cancel giveaway.' };
  }

  clearGiveawayTimer(giveawayId);

  if (client) {
    await disableGiveawayButton(client, cancelled);
  }

  logger.info({
    giveawayId,
    guildId: giveaway.guild_id,
  }, 'Giveaway cancelled');

  return { giveaway: cancelled, message: 'Giveaway has been cancelled.' };
}

export async function rerollGiveaway(
  giveawayId: number,
  repo: GiveawayRepository,
  client?: Client
): Promise<{ winner: GiveawayWinnerRow | null; message: string }> {
  const giveaway = await repo.getGiveaway(giveawayId);
  if (!giveaway) {
    return { winner: null, message: 'Giveaway not found.' };
  }

  if (giveaway.status !== 'ENDED') {
    return { winner: null, message: 'Giveaway must be ended before rerolling.' };
  }

  const candidates = await repo.getEligibleRerollCandidates(giveawayId);
  if (candidates.length === 0) {
    return { winner: null, message: 'No eligible candidates for reroll.' };
  }

  const winnerUserIds = await selectWinners(candidates, 1);
  if (winnerUserIds.length === 0) {
    return { winner: null, message: 'No eligible candidates for reroll.' };
  }

  const existingWinners = await repo.getWinners(giveawayId);
  const maxReroll = existingWinners.reduce((max, w) => Math.max(max, w.reroll_number), 0);

  const winner = await repo.createWinner({
    giveaway_id: giveawayId,
    guild_id: giveaway.guild_id,
    user_id: winnerUserIds[0],
    reroll_number: maxReroll + 1,
  });

  logger.info({
    giveawayId,
    guildId: giveaway.guild_id,
    winnerId: winnerUserIds[0],
    rerollNumber: winner.reroll_number,
  }, 'Giveaway rerolled');

  if (client && giveaway.channel_id && giveaway.message_id) {
    try {
      const channel = await client.channels.fetch(giveaway.channel_id) as TextChannel | null;
      if (channel) {
        await channel.send({
          content: `Reroll! New winner: <@${winnerUserIds[0]}>`,
        });
      }
    } catch {
      // channel may not exist
    }
  }

  return { winner, message: `Reroll winner: <@${winnerUserIds[0]}>` };
}

export function scheduleGiveawayTimer(
  giveaway: GiveawayRow,
  repo: GiveawayRepository,
  client: Client
): void {
  if (giveaway.status !== 'ACTIVE') return;

  const endsAt = new Date(giveaway.ends_at).getTime();
  const now = Date.now();
  const delay = endsAt - now;

  if (delay <= 0) {
    endGiveaway(giveaway.id, repo, client).catch((err) => {
      logger.error({ err, giveawayId: giveaway.id }, 'Failed to end expired giveaway on startup');
    });
    return;
  }

  if (giveawayTimers.has(giveaway.id)) {
    return;
  }

  const timer = setTimeout(() => {
    giveawayTimers.delete(giveaway.id);
    endGiveaway(giveaway.id, repo, client).catch((err) => {
      logger.error({ err, giveawayId: giveaway.id }, 'Failed to end giveaway via timer');
    });
  }, delay);

  timer.unref?.();
  giveawayTimers.set(giveaway.id, timer);
}

export function clearGiveawayTimer(giveawayId: number): void {
  const timer = giveawayTimers.get(giveawayId);
  if (timer) {
    clearTimeout(timer);
    giveawayTimers.delete(giveawayId);
  }
}

export async function restoreGiveawayTimers(
  repo: GiveawayRepository,
  client: Client
): Promise<void> {
  try {
    const activeGiveaways = await repo.getAllActiveGiveaways();
    let restored = 0;

    for (const giveaway of activeGiveaways) {
      const endsAt = new Date(giveaway.ends_at).getTime();
      if (endsAt <= Date.now()) {
        await endGiveaway(giveaway.id, repo, client).catch((err) => {
          logger.error({ err, giveawayId: giveaway.id }, 'Failed to end expired giveaway during restore');
        });
      } else {
        scheduleGiveawayTimer(giveaway, repo, client);
        restored++;
      }
    }

    logger.info({ restored, expired: activeGiveaways.length - restored }, 'Giveaway timers restored');
  } catch (error) {
    logger.error({ err: error }, 'Failed to restore giveaway timers');
  }
}

export async function updateGiveawayMessage(
  client: Client,
  giveaway: GiveawayRow,
  winners: GiveawayWinnerRow[],
  entryCount: number
): Promise<void> {
  if (!giveaway.channel_id || !giveaway.message_id) return;

  try {
    const channel = await client.channels.fetch(giveaway.channel_id) as TextChannel | null;
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
    if (!message) return;

    const embed = createGiveawayEmbed(giveaway, entryCount);
    const row = createGiveawayButton(giveaway.id, false);

    await message.edit({ embeds: [embed], components: [row] }).catch(() => {});
  } catch {
    // channel/message may not exist
  }
}

export async function disableGiveawayButton(
  client: Client,
  giveaway: GiveawayRow
): Promise<void> {
  if (!giveaway.channel_id || !giveaway.message_id) return;

  try {
    const channel = await client.channels.fetch(giveaway.channel_id) as TextChannel | null;
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
    if (!message) return;

    const embed = createGiveawayEmbed(giveaway, 0);
    const row = createGiveawayButton(giveaway.id, false);

    await message.edit({ embeds: [embed], components: [row] }).catch(() => {});
  } catch {
    // channel/message may not exist
  }
}

export async function announceWinners(
  client: Client,
  giveaway: GiveawayRow,
  winners: GiveawayWinnerRow[]
): Promise<void> {
  if (winners.length === 0) return;
  if (!giveaway.channel_id) return;

  try {
    const channel = await client.channels.fetch(giveaway.channel_id) as TextChannel | null;
    if (!channel) return;

    const winnersStr = winners.map((w) => `<@${w.user_id}>`).join(', ');
    await channel.send({
      content: `Congratulations ${winnersStr}! You won **${giveaway.prize}**!`,
    });
  } catch {
    // channel may not exist
  }
}

export function canManageGiveaway(
  member: GuildMember,
  giveaway: GiveawayRow
): boolean {
  if (member.id === giveaway.host_id) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return false;
}

export function createGiveawayInfoEmbed(
  giveaway: GiveawayRow,
  entryCount: number,
  winners: GiveawayWinnerRow[]
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Giveaway Information')
    .setColor(Colors.Blurple)
    .addFields(
      { name: 'Prize', value: giveaway.prize, inline: true },
      { name: 'Status', value: giveaway.status, inline: true },
      { name: 'Winners', value: String(giveaway.winner_count), inline: true },
      { name: 'Entries', value: String(entryCount), inline: true },
      { name: 'Host', value: `<@${giveaway.host_id}>`, inline: true },
      { name: 'Channel', value: `<#${giveaway.channel_id}>`, inline: true },
      { name: 'ID', value: String(giveaway.id), inline: true },
      { name: 'Created', value: `<t:${Math.floor(new Date(giveaway.created_at).getTime() / 1000)}:R>`, inline: true },
      { name: 'Ends', value: `<t:${Math.floor(new Date(giveaway.ends_at).getTime() / 1000)}:R>`, inline: true },
    );

  if (giveaway.description) {
    embed.setDescription(giveaway.description);
  }

  if (winners.length > 0) {
    const winnersStr = winners.map((w) => `<@${w.user_id}>`).join(', ');
    embed.addFields({ name: 'Winners', value: winnersStr, inline: false });
  }

  if (giveaway.message_id) {
    embed.setURL(`https://discord.com/channels/${giveaway.guild_id}/${giveaway.channel_id}/${giveaway.message_id}`);
  }

  return embed;
}

export function createGiveawayListEmbed(
  giveaways: GiveawayRow[],
  guildName: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Giveaways — ${guildName}`)
    .setColor(Colors.Gold);

  if (giveaways.length === 0) {
    embed.setDescription('No giveaways found.');
    return embed;
  }

  const lines = giveaways.map((g) => {
    const statusIcon = g.status === 'ACTIVE' ? '🟢' : g.status === 'ENDED' ? '🔴' : '⚫';
    return `${statusIcon} **#${g.id}** — ${g.prize} — ${g.status}`;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
}
