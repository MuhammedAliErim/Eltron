import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { TicketRepository } from '../../database/repositories/TicketRepository';
import { TicketCategoryRepository } from '../../database/repositories/TicketCategoryRepository';
import {
  createTicket,
  closeTicket,
  reopenTicket,
  claimTicket,
  unclaimTicket,
  getTicketInfo,
} from '../../services/ticket/TicketService';
import { TicketCategory } from '../../database/schema';

const repo = new TicketRepository();
const categoryRepo = new TicketCategoryRepository();

export default class TicketCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket management')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new ticket')
        .addStringOption((opt) =>
          opt.setName('category')
            .setDescription('Ticket category')
            .setRequired(false)
            .addChoices(
              { name: 'General', value: 'general' },
              { name: 'Support', value: 'support' },
              { name: 'Report', value: 'report' },
              { name: 'Other', value: 'other' },
            )
        )
        .addStringOption((opt) =>
          opt.setName('subject').setDescription('Ticket subject').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Close a ticket')
        .addIntegerOption((opt) =>
          opt.setName('ticket_id').setDescription('Ticket ID to close').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reopen')
        .setDescription('Reopen a closed ticket')
        .addIntegerOption((opt) =>
          opt.setName('ticket_id').setDescription('Ticket ID to reopen').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('claim')
        .setDescription('Claim a ticket')
        .addIntegerOption((opt) =>
          opt.setName('ticket_id').setDescription('Ticket ID to claim').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('unclaim')
        .setDescription('Unclaim a ticket')
        .addIntegerOption((opt) =>
          opt.setName('ticket_id').setDescription('Ticket ID to unclaim').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Get ticket information')
        .addIntegerOption((opt) =>
          opt.setName('ticket_id').setDescription('Ticket ID').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List tickets for this server')
        .addStringOption((opt) =>
          opt.setName('status')
            .setDescription('Filter by status')
            .setRequired(false)
            .addChoices(
              { name: 'Open', value: 'OPEN' },
              { name: 'Claimed', value: 'CLAIMED' },
              { name: 'Closed', value: 'CLOSED' },
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('category')
        .setDescription('Create a ticket category')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Category name').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('emoji').setDescription('Category emoji').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('description').setDescription('Category description').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('categories')
        .setDescription('List all ticket categories')
    )
    .addSubcommand((sub) =>
      sub
        .setName('setautoresponse')
        .setDescription('Set auto-response for a category')
        .addStringOption((opt) =>
          opt.setName('category_id').setDescription('Category ID').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('response').setDescription('Auto-response message').setRequired(true)
        )
    );

  category = 'Staff';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    switch (subcommand) {
      case 'create':
        return this.handleCreate(interaction);
      case 'close':
        return this.handleClose(interaction);
      case 'reopen':
        return this.handleReopen(interaction);
      case 'claim':
        return this.handleClaim(interaction);
      case 'unclaim':
        return this.handleUnclaim(interaction);
      case 'info':
        return this.handleInfo(interaction);
      case 'list':
        return this.handleList(interaction);
      case 'category':
        return this.handleCategory(interaction);
      case 'categories':
        return this.handleCategories(interaction);
      case 'setautoresponse':
        return this.handleSetAutoResponse(interaction);
    }
  }

  private async handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
    const category = (interaction.options.getString('category') || 'general') as TicketCategory;
    const subject = interaction.options.getString('subject') || '';

    const member = interaction.member as GuildMember;
    if (!member) {
      await interaction.editReply({ content: 'Could not identify you as a member.' });
      return;
    }

    const result = await createTicket(
      interaction.guild!,
      member,
      category,
      subject,
      repo
    );

    await interaction.editReply({ content: result.message });
  }

  private async handleClose(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need Manage Server permission to perform this action.' });
      return;
    }

    const ticketId = interaction.options.getInteger('ticket_id');

    let ticket;
    if (ticketId) {
      ticket = await repo.getTicket(ticketId);
    } else {
      ticket = await repo.getTicketByChannel(interaction.channelId);
    }

    if (!ticket) {
      await interaction.editReply({ content: 'Ticket not found.' });
      return;
    }

    if (ticket.guild_id !== interaction.guildId) {
      await interaction.editReply({ content: 'Ticket not found in this server.' });
      return;
    }

    if (ticket.status === 'CLOSED') {
      await interaction.editReply({ content: 'Ticket is already closed.' });
      return;
    }

    const member = interaction.member as GuildMember;
    if (!member) {
      await interaction.editReply({ content: 'Could not identify you as a member.' });
      return;
    }

    const result = await closeTicket(ticket, interaction.user.id, interaction.guild!, repo);
    await interaction.editReply({ content: result.message });
  }

  private async handleReopen(interaction: ChatInputCommandInteraction): Promise<void> {
    const ticketId = interaction.options.getInteger('ticket_id', true);

    const ticket = await repo.getTicket(ticketId);
    if (!ticket) {
      await interaction.editReply({ content: 'Ticket not found.' });
      return;
    }

    if (ticket.guild_id !== interaction.guildId) {
      await interaction.editReply({ content: 'Ticket not found in this server.' });
      return;
    }

    if (ticket.status !== 'CLOSED') {
      await interaction.editReply({ content: 'Ticket is not closed.' });
      return;
    }

    const result = await reopenTicket(ticket, interaction.guild!, repo);
    await interaction.editReply({ content: result.message });
  }

  private async handleClaim(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need Manage Server permission to perform this action.' });
      return;
    }

    const ticketId = interaction.options.getInteger('ticket_id');

    let ticket;
    if (ticketId) {
      ticket = await repo.getTicket(ticketId);
    } else {
      ticket = await repo.getTicketByChannel(interaction.channelId);
    }

    if (!ticket) {
      await interaction.editReply({ content: 'Ticket not found.' });
      return;
    }

    if (ticket.guild_id !== interaction.guildId) {
      await interaction.editReply({ content: 'Ticket not found in this server.' });
      return;
    }

    if (ticket.status === 'CLOSED') {
      await interaction.editReply({ content: 'Cannot claim a closed ticket.' });
      return;
    }

    const member = interaction.member as GuildMember;
    if (!member) {
      await interaction.editReply({ content: 'Could not identify you as a member.' });
      return;
    }

    const result = await claimTicket(ticket, member, repo);
    await interaction.editReply({ content: result.message });
  }

  private async handleUnclaim(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need Manage Server permission to perform this action.' });
      return;
    }

    const ticketId = interaction.options.getInteger('ticket_id');

    let ticket;
    if (ticketId) {
      ticket = await repo.getTicket(ticketId);
    } else {
      ticket = await repo.getTicketByChannel(interaction.channelId);
    }

    if (!ticket) {
      await interaction.editReply({ content: 'Ticket not found.' });
      return;
    }

    if (ticket.guild_id !== interaction.guildId) {
      await interaction.editReply({ content: 'Ticket not found in this server.' });
      return;
    }

    if (ticket.status !== 'CLAIMED') {
      await interaction.editReply({ content: 'Ticket is not claimed.' });
      return;
    }

    const result = await unclaimTicket(ticket, repo);
    await interaction.editReply({ content: result.message });
  }

  private async handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
    const ticketId = interaction.options.getInteger('ticket_id');

    let ticket;
    if (ticketId) {
      ticket = await repo.getTicket(ticketId);
    } else {
      ticket = await repo.getTicketByChannel(interaction.channelId);
    }

    if (!ticket) {
      await interaction.editReply({ content: 'Ticket not found.' });
      return;
    }

    if (ticket.guild_id !== interaction.guildId) {
      await interaction.editReply({ content: 'Ticket not found in this server.' });
      return;
    }

    const embed = getTicketInfo(ticket);
    await interaction.editReply({ embeds: [embed] });
  }

  private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
    const status = interaction.options.getString('status') || undefined;

    const tickets = await repo.listGuildTickets(interaction.guildId!, status);

    if (tickets.length === 0) {
      await interaction.editReply({ content: 'No tickets found.' });
      return;
    }

    const lines = tickets.slice(0, 25).map((t) => {
      const statusIcon = t.status === 'OPEN' ? '🟢' : t.status === 'CLAIMED' ? '🟡' : '🔴';
      return `${statusIcon} **#${t.id}** — <@${t.creator_id}> — ${t.status} — <#${t.channel_id}>`;
    });

    await interaction.editReply({
      content: lines.join('\n'),
    });
  }

  private async handleCategory(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need Manage Server permission to perform this action.' });
      return;
    }

    const name = interaction.options.getString('name', true);
    const emoji = interaction.options.getString('emoji', true);
    const description = interaction.options.getString('description') ?? '';

    try {
      const category = await categoryRepo.create({
        guild_id: interaction.guildId!,
        name,
        emoji,
        description,
      });

      await interaction.editReply({
        content: `Category created: ${emoji} **${name}** (ID: \`${category.id}\`)`,
      });
    } catch (error) {
      await interaction.editReply({ content: 'Failed to create category.' });
    }
  }

  private async handleCategories(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const categories = await categoryRepo.getByGuild(interaction.guildId!);

      if (categories.length === 0) {
        await interaction.editReply({ content: 'No ticket categories found.' });
        return;
      }

      const lines = categories.map((c) => `${c.emoji} **${c.name}** — ${c.description || 'No description'} (ID: \`${c.id}\`)`);
      await interaction.editReply({ content: lines.join('\n') });
    } catch (error) {
      await interaction.editReply({ content: 'Failed to fetch categories.' });
    }
  }

  private async handleSetAutoResponse(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need Manage Server permission to perform this action.' });
      return;
    }

    const categoryId = interaction.options.getString('category_id', true);
    const response = interaction.options.getString('response', true);

    try {
      const updated = await categoryRepo.update(categoryId, { auto_response: response });

      if (!updated) {
        await interaction.editReply({ content: 'Category not found.' });
        return;
      }

      await interaction.editReply({
        content: `Auto-response set for category **${updated.name}**.`,
      });
    } catch (error) {
      await interaction.editReply({ content: 'Failed to set auto-response.' });
    }
  }
}
