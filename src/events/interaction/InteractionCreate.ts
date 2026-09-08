import { Interaction, Collection, MessageFlags } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { logError } from '../../utils/logger';
import { PermissionGuard } from '../../middleware/PermissionGuard';
import { ErrorGuard } from '../../middleware/ErrorGuard';
import { GiveawayRepository } from '../../database/repositories/GiveawayRepository';
import { joinGiveaway, leaveGiveaway, createGiveawayEmbed } from '../../services/giveaway/GiveawayService';
import { joinEvent, leaveEvent, buildEventEmbed } from '../../services/event/EventService';
import { vote, removeVote, buildPollEmbedBuilder, buildPollVoteButtons } from '../../services/poll/PollService';
import { PollRepository } from '../../database/repositories/PollRepository';

const COOLDOWN_SECONDS = 3;

export default class InteractionCreateEvent extends Event<'interactionCreate'> {
  name = 'interactionCreate' as const;

  async execute(client: EltronClient, interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
      await this.handleCommand(client, interaction);
    } else if (interaction.isAutocomplete()) {
      await this.handleAutocomplete(client, interaction);
    } else if (interaction.isModalSubmit()) {
      await this.handleModalSubmit(client, interaction);
    } else if (interaction.isButton()) {
      await this.handleButton(client, interaction);
    }
  }

  private async handleCommand(
    client: EltronClient,
    interaction: import('discord.js').ChatInputCommandInteraction
  ): Promise<void> {
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      if (command.developerOnly) {
        PermissionGuard.checkDeveloperOnly(interaction);
      }

      if (command.requiredPermissions) {
        PermissionGuard.checkPermissions(interaction, command.requiredPermissions);
      }

      if (!client.cooldowns.has(interaction.commandName)) {
        client.cooldowns.set(interaction.commandName, new Collection());
      }

      const now = Date.now();
      const timestamps = client.cooldowns.get(interaction.commandName)!;
      const cooldownAmount = (command.cooldown || COOLDOWN_SECONDS) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1000);
          await interaction.reply({
            content: `You are on cooldown. Try again <t:${expiredTimestamp}:R>.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      timestamps.set(interaction.user.id, now);
      const timerKey = `${interaction.commandName}:${interaction.user.id}`;
      const timer = setTimeout(() => {
        timestamps.delete(interaction.user.id);
        client.removeCooldownTimer(timerKey);
        if (timestamps.size === 0) {
          client.cooldowns.delete(interaction.commandName);
        }
      }, cooldownAmount);
      client.setCooldownTimer(timerKey, timer);

      await command.execute({ client, interaction });
    } catch (error) {
      await ErrorGuard.handle(error, interaction);
    }
  }

  private async handleAutocomplete(
    client: EltronClient,
    interaction: import('discord.js').AutocompleteInteraction
  ): Promise<void> {
    const command = client.commands.get(interaction.commandName);

    if (!command || !command.autocomplete) return;

    try {
      await command.autocomplete({ client, interaction });
    } catch (error) {
      logError(`Error in autocomplete for ${interaction.commandName}`, error);
    }
  }

  private async handleModalSubmit(
    client: EltronClient,
    interaction: import('discord.js').ModalSubmitInteraction
  ): Promise<void> {
    if (interaction.customId.startsWith('app_submit:')) {
      const command = client.commands.get('application');
      if (command && 'handleModalSubmit' in command) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (command as any).handleModalSubmit(interaction);
        } catch (error) {
          logError(`Error in modal submit for application`, error);
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: 'An error occurred.', flags: MessageFlags.Ephemeral });
            }
          } catch {
            // interaction may already be handled
          }
        }
      }
    }
  }

  private async handleButton(
    client: EltronClient,
    interaction: import('discord.js').ButtonInteraction
  ): Promise<void> {
    if (interaction.customId.startsWith('giveaway:')) {
      await this.handleGiveawayButton(client, interaction);
    } else if (interaction.customId.startsWith('event:')) {
      await this.handleEventButton(client, interaction);
    } else if (interaction.customId.startsWith('poll:')) {
      await this.handlePollButton(client, interaction);
    }
  }

  private async handleGiveawayButton(
    client: EltronClient,
    interaction: import('discord.js').ButtonInteraction
  ): Promise<void> {
    const parts = interaction.customId.split(':');
    if (parts.length !== 3) return;

    const action = parts[1];
    const giveawayId = parseInt(parts[2], 10);

    if (isNaN(giveawayId)) {
      await interaction.reply({ content: 'Invalid giveaway.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (!interaction.guildId) {
      await interaction.reply({ content: 'This can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const repo = new GiveawayRepository();

    try {
      if (action === 'join') {
        const result = await joinGiveaway(giveawayId, interaction.guildId, interaction.user.id, repo);

        const giveaway = await repo.getGiveaway(giveawayId);
        if (giveaway && result.entryCount > 0) {
          try {
            const channel = await client.channels.fetch(giveaway.channel_id);
            if (channel && 'messages' in channel) {
              const message = await channel.messages.fetch(giveaway.message_id!).catch(() => null);
              if (message) {
                const embed = createGiveawayEmbed(giveaway, result.entryCount);
                await message.edit({ embeds: [embed] }).catch(() => {});
              }
            }
          } catch {
            // channel may not exist
          }
        }

        await interaction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
      } else if (action === 'leave') {
        const result = await leaveGiveaway(giveawayId, interaction.guildId, interaction.user.id, repo);

        const giveaway = await repo.getGiveaway(giveawayId);
        if (giveaway && result.entryCount >= 0) {
          try {
            const channel = await client.channels.fetch(giveaway.channel_id);
            if (channel && 'messages' in channel) {
              const message = await channel.messages.fetch(giveaway.message_id!).catch(() => null);
              if (message) {
                const embed = createGiveawayEmbed(giveaway, result.entryCount);
                await message.edit({ embeds: [embed] }).catch(() => {});
              }
            }
          } catch {
            // channel may not exist
          }
        }

        await interaction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
      }
    } catch (error) {
      logError(`Error handling giveaway button interaction`, error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'An error occurred.', flags: MessageFlags.Ephemeral });
        }
      } catch {
        // interaction may already be handled
      }
    }
  }

  private async handleEventButton(
    client: EltronClient,
    interaction: import('discord.js').ButtonInteraction
  ): Promise<void> {
    const parts = interaction.customId.split(':');
    if (parts.length !== 3) return;

    const action = parts[1];
    const eventId = parseInt(parts[2], 10);

    if (isNaN(eventId)) {
      await interaction.reply({ content: 'Invalid event.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (!interaction.guildId) {
      await interaction.reply({ content: 'This can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      if (action === 'join') {
        const { event, participantCount } = await joinEvent(
          eventId,
          interaction.guildId,
          interaction.user.id,
          interaction.user.bot
        );

        try {
          const channel = await client.channels.fetch(event.channel_id);
          if (channel && 'messages' in channel) {
            const message = await channel.messages.fetch(event.message_id!).catch(() => null);
            if (message) {
              const embed = buildEventEmbed(event, participantCount);
              await message.edit({ embeds: [embed] }).catch(() => {});
            }
          }
        } catch {
          // channel may not exist
        }

        await interaction.reply({ content: `✅ You've joined **${event.title}**!`, flags: MessageFlags.Ephemeral });
      } else if (action === 'leave') {
        const { event, participantCount } = await leaveEvent(
          eventId,
          interaction.guildId,
          interaction.user.id
        );

        try {
          const channel = await client.channels.fetch(event.channel_id);
          if (channel && 'messages' in channel) {
            const message = await channel.messages.fetch(event.message_id!).catch(() => null);
            if (message) {
              const embed = buildEventEmbed(event, participantCount);
              await message.edit({ embeds: [embed] }).catch(() => {});
            }
          }
        } catch {
          // channel may not exist
        }

        await interaction.reply({ content: `👋 You've left **${event.title}**`, flags: MessageFlags.Ephemeral });
      }
    } catch (error) {
      logError(`Error handling event button interaction`, error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'An error occurred.', flags: MessageFlags.Ephemeral });
        }
      } catch {
        // interaction may already be handled
      }
    }
  }

  private async handlePollButton(
    client: EltronClient,
    interaction: import('discord.js').ButtonInteraction
  ): Promise<void> {
    const parts = interaction.customId.split(':');
    if (parts.length < 3) return;

    const action = parts[1];

    if (!interaction.guildId) {
      await interaction.reply({ content: 'This can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      if (action === 'vote') {
        if (parts.length !== 4) return;
        const pollId = parseInt(parts[2], 10);
        const optionId = parseInt(parts[3], 10);

        if (isNaN(pollId) || isNaN(optionId)) {
          await interaction.reply({ content: 'Invalid poll or option.', flags: MessageFlags.Ephemeral });
          return;
        }

        const { poll, options, results } = await vote(
          pollId,
          interaction.guildId,
          interaction.user.id,
          optionId,
          interaction.user.bot
        );

        try {
          const channel = await client.channels.fetch(poll.channel_id);
          if (channel && 'messages' in channel) {
            const message = await channel.messages.fetch(poll.message_id!).catch(() => null);
            if (message) {
              const pollRepo = new PollRepository();
              const userVotes = await pollRepo.getUserVotes(pollId, interaction.user.id);
              const embed = buildPollEmbedBuilder(poll, options, results);
              const buttons = buildPollVoteButtons(pollId, options, userVotes);
              await message.edit({ embeds: [embed], components: buttons }).catch(() => {});
            }
          }
        } catch {
          // channel may not exist
        }

        await interaction.reply({ content: '✅ Your vote has been recorded!', flags: MessageFlags.Ephemeral });
      } else if (action === 'remove') {
        const pollId = parseInt(parts[2], 10);

        if (isNaN(pollId)) {
          await interaction.reply({ content: 'Invalid poll.', flags: MessageFlags.Ephemeral });
          return;
        }

        const { poll, options, results } = await removeVote(
          pollId,
          interaction.guildId,
          interaction.user.id
        );

        try {
          const channel = await client.channels.fetch(poll.channel_id);
          if (channel && 'messages' in channel) {
            const message = await channel.messages.fetch(poll.message_id!).catch(() => null);
            if (message) {
              const pollRepo = new PollRepository();
              const userVotes = await pollRepo.getUserVotes(pollId, interaction.user.id);
              const embed = buildPollEmbedBuilder(poll, options, results);
              const buttons = buildPollVoteButtons(pollId, options, userVotes);
              await message.edit({ embeds: [embed], components: buttons }).catch(() => {});
            }
          }
        } catch {
          // channel may not exist
        }

        await interaction.reply({ content: '🗳️ Your vote has been removed.', flags: MessageFlags.Ephemeral });
      }
    } catch (error) {
      logError(`Error handling poll button interaction`, error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'An error occurred.', flags: MessageFlags.Ephemeral });
        }
      } catch {
        // interaction may already be handled
      }
    }
  }
}
