import {
  Guild,
  GuildMember,
  TextChannel,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
  OverwriteType,
} from 'discord.js';
import { Cache } from '../../utils/cache';
import { TicketRow, TicketCategory } from '../../database/schema';
import { TicketRepository } from '../../database/repositories/TicketRepository';
import { logger } from '../../utils/logger';

const MAX_OPEN_TICKETS_PER_USER = 1;

const ticketCooldownCache = new Cache<boolean>(30000);

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  general: 'General',
  support: 'Support',
  report: 'Report',
  other: 'Other',
};

const canClaimTicket = (member: GuildMember): boolean => {
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  if (member.permissions.has(PermissionFlagsBits.BanMembers)) return true;
  return false;
};

export const createTicket = async (
  guild: Guild,
  creator: GuildMember,
  category: TicketCategory,
  subject: string,
  repo: TicketRepository
): Promise<{
  success: boolean;
  ticket?: TicketRow;
  channel?: TextChannel;
  message: string;
}> => {
  const cooldownKey = `ticket_cd:${guild.id}:${creator.id}`;
  if (ticketCooldownCache.get(cooldownKey)) {
    return { success: false, message: 'Please wait before creating another ticket.' };
  }

  const existingOpen = await repo.getOpenTicketByUser(guild.id, creator.id);
  if (existingOpen) {
    return {
      success: false,
      message: `You already have an open ticket (<#${existingOpen.channel_id}>).`,
    };
  }

  const openCount = await repo.countOpenTickets(guild.id, creator.id);
  if (openCount >= MAX_OPEN_TICKETS_PER_USER) {
    return { success: false, message: 'You have reached the maximum number of open tickets.' };
  }

  const safeName = creator.displayName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  const channelName = `ticket-${safeName}`;

  try {
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: `Ticket by ${creator.user.tag} | ${CATEGORY_LABELS[category]}`,
    });

    const permissionOverwrites = [
      {
        id: guild.id,
        type: OverwriteType.Role,
        allow: [],
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: creator.id,
        type: OverwriteType.Member,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
        deny: [],
      },
      {
        id: guild.members.me!.id,
        type: OverwriteType.Member,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
        deny: [],
      },
    ];

    await channel.edit({ permissionOverwrites });

    const ticket = await repo.createTicket({
      guild_id: guild.id,
      channel_id: channel.id,
      creator_id: creator.id,
      category,
      subject,
    });

    ticketCooldownCache.set(cooldownKey, true);

    const embed = new EmbedBuilder()
      .setTitle(`Ticket #${ticket.id}`)
      .setColor(Colors.Blue)
      .addFields(
        { name: 'Category', value: CATEGORY_LABELS[category], inline: true },
        { name: 'Status', value: 'Open', inline: true },
        { name: 'Created By', value: `${creator}`, inline: true },
      )
      .setTimestamp();

    if (subject) {
      embed.addFields({ name: 'Subject', value: subject.substring(0, 1024) });
    }

    embed.setDescription('A staff member will be with you shortly. Use `/ticket close` to close this ticket.');

    await channel.send({ embeds: [embed] });

    logger.info({
      guildId: guild.id,
      ticketId: ticket.id,
      channelId: channel.id,
      creatorId: creator.id,
      category,
    }, 'Ticket created');

    return { success: true, ticket, channel, message: `Ticket created: ${channel}` };
  } catch (error) {
    logger.error({ err: error, guildId: guild.id, creatorId: creator.id }, 'Failed to create ticket channel');
    return { success: false, message: 'Failed to create ticket channel.' };
  }
};

export const closeTicket = async (
  ticket: TicketRow,
  closedBy: string,
  guild: Guild,
  repo: TicketRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  const updated = await repo.closeTicket(ticket.id, closedBy);

  if (!updated) {
    return { success: false, message: 'Failed to close ticket.' };
  }

  try {
    const channel = guild.channels.cache.get(ticket.channel_id) as TextChannel | undefined;
    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle(`Ticket #${ticket.id} Closed`)
        .setColor(Colors.Red)
        .addFields(
          { name: 'Status', value: 'Closed', inline: true },
          { name: 'Closed By', value: `<@${closedBy}>`, inline: true },
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      setTimeout(async () => {
        try {
          await channel.delete('Ticket closed');
        } catch (error) {
          logger.warn({ err: error, channelId: channel.id }, 'Failed to delete ticket channel');
        }
      }, 5000);
    }
  } catch (error) {
    logger.warn({ err: error, ticketId: ticket.id }, 'Error during ticket close');
  }

  logger.info({
    guildId: ticket.guild_id,
    ticketId: ticket.id,
    closedBy,
  }, 'Ticket closed');

  return { success: true, message: 'Ticket closed.' };
};

export const reopenTicket = async (
  ticket: TicketRow,
  guild: Guild,
  repo: TicketRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  const updated = await repo.reopenTicket(ticket.id);

  if (!updated) {
    return { success: false, message: 'Failed to reopen ticket.' };
  }

  try {
    const channel = guild.channels.cache.get(ticket.channel_id) as TextChannel | undefined;
    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle(`Ticket #${ticket.id} Reopened`)
        .setColor(Colors.Green)
        .addFields(
          { name: 'Status', value: 'Open', inline: true },
        )
        .setDescription('This ticket has been reopened.')
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    logger.warn({ err: error, ticketId: ticket.id }, 'Error during ticket reopen');
  }

  logger.info({
    guildId: ticket.guild_id,
    ticketId: ticket.id,
  }, 'Ticket reopened');

  return { success: true, message: 'Ticket reopened.' };
};

export const claimTicket = async (
  ticket: TicketRow,
  staff: GuildMember,
  repo: TicketRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  if (!canClaimTicket(staff)) {
    return { success: false, message: 'You do not have permission to claim tickets.' };
  }

  const updated = await repo.claimTicket(ticket.id, staff.id);

  if (!updated) {
    return { success: false, message: 'Failed to claim ticket. It may already be claimed.' };
  }

  logger.info({
    guildId: ticket.guild_id,
    ticketId: ticket.id,
    staffId: staff.id,
  }, 'Ticket claimed');

  return { success: true, message: `Ticket claimed by ${staff}.` };
};

export const unclaimTicket = async (
  ticket: TicketRow,
  repo: TicketRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  const updated = await repo.unclaimTicket(ticket.id);

  if (!updated) {
    return { success: false, message: 'Failed to unclaim ticket.' };
  }

  logger.info({
    guildId: ticket.guild_id,
    ticketId: ticket.id,
  }, 'Ticket unclaimed');

  return { success: true, message: 'Ticket unclaimed.' };
};

export const getTicketInfo = (ticket: TicketRow): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle(`Ticket #${ticket.id}`)
    .setColor(
      ticket.status === 'OPEN'
        ? Colors.Blue
        : ticket.status === 'CLAIMED'
          ? Colors.Gold
          : Colors.Grey
    )
    .addFields(
      { name: 'Status', value: ticket.status, inline: true },
      { name: 'Category', value: CATEGORY_LABELS[ticket.category as TicketCategory] || ticket.category, inline: true },
      { name: 'Created By', value: `<@${ticket.creator_id}>`, inline: true },
      { name: 'Channel', value: `<#${ticket.channel_id}>`, inline: true },
    )
    .setTimestamp(new Date(ticket.created_at));

  if (ticket.assigned_to) {
    embed.addFields({ name: 'Claimed By', value: `<@${ticket.assigned_to}>`, inline: true });
  }

  if (ticket.subject) {
    embed.addFields({ name: 'Subject', value: ticket.subject.substring(0, 1024) });
  }

  if (ticket.status === 'CLOSED') {
    embed.addFields(
      { name: 'Closed By', value: ticket.closed_by ? `<@${ticket.closed_by}>` : 'Unknown', inline: true },
      { name: 'Closed At', value: ticket.closed_at ? `<t:${Math.floor(new Date(ticket.closed_at).getTime() / 1000)}:R>` : 'Unknown', inline: true },
    );
  }

  return embed;
};
