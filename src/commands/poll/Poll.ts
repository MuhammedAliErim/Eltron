import { SlashCommandBuilder, Colors, EmbedBuilder, APIEmbedField } from 'discord.js';
import { Command, type CommandExecuteOptions } from '../../structures/Command';
import {
  createPoll,
  getPollById,
  listPollsByGuild,
  endPoll,
  cancelPoll,
  getPollResults,
  buildPollEmbedBuilder,
} from '../../services/poll/PollService';
import { BOT_OWNERS } from '../../config/bot';
import { logError } from '../../utils/logger';
import { GuildOnlyError, ValidationError } from '../../utils/errors';
import { PollRepository } from '../../database/repositories/PollRepository';
import { parseDuration } from '../../utils/duration';

const pollRepository = new PollRepository();

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'ACTIVE': return '🟢';
    case 'ENDED': return '🔴';
    case 'CANCELLED': return '⛔';
    default: return '❓';
  }
}

export default class PollCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Manage server polls')
    .setDefaultMemberPermissions(0)
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a new poll')
      .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
      .addStringOption(opt => opt.setName('options').setDescription('Options separated by | (e.g. Option 1 | Option 2 | Option 3)').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Poll description').setRequired(false))
      .addBooleanOption(opt => opt.setName('multiple_choice').setDescription('Allow multiple votes per user').setRequired(false))
      .addBooleanOption(opt => opt.setName('anonymous').setDescription('Hide who voted for what').setRequired(false))
      .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 1h, 30m, 7d)').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List active polls')
    )
    .addSubcommand(sub => sub
      .setName('info')
      .setDescription('Get poll details')
      .addIntegerOption(opt => opt.setName('poll_id').setDescription('Poll ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('end')
      .setDescription('End a poll')
      .addIntegerOption(opt => opt.setName('poll_id').setDescription('Poll ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('cancel')
      .setDescription('Cancel a poll')
      .addIntegerOption(opt => opt.setName('poll_id').setDescription('Poll ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('results')
      .setDescription('Get poll results')
      .addIntegerOption(opt => opt.setName('poll_id').setDescription('Poll ID').setRequired(true))
    );

  category = 'Events & Giveaways';
  cooldown = 3;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guildId) throw new GuildOnlyError();
    const guildId = interaction.guildId;
    const hasManageGuild = interaction.memberPermissions?.has('ManageGuild') ?? false;

    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'create': {
          await interaction.deferReply();

          const question = interaction.options.getString('question', true);
          const description = interaction.options.getString('description') || undefined;
          const optionsRaw = interaction.options.getString('options', true);
          const multipleChoice = interaction.options.getBoolean('multiple_choice') || false;
          const anonymous = interaction.options.getBoolean('anonymous') || false;
          const durationRaw = interaction.options.getString('duration') || undefined;

          const optionsList = optionsRaw
            .split('|')
            .map(opt => opt.trim())
            .filter(opt => opt.length > 0);

          if (optionsList.length < 2) {
            throw new ValidationError('Please provide at least 2 options separated by |');
          }

          if (optionsList.length > 10) {
            throw new ValidationError('Maximum 10 options allowed');
          }

          let endsAt: string | undefined;
          if (durationRaw) {
            const durationResult = parseDuration(durationRaw);
            if (!durationResult.valid) {
              throw new ValidationError(durationResult.error!, 'duration');
            }
            endsAt = new Date(Date.now() + durationResult.milliseconds!).toISOString();
          }

          const { poll, options } = await createPoll({
            guildId,
            channelId: interaction.channelId,
            creatorId: interaction.user.id,
            userBot: interaction.user.bot,
            hasManageGuild,
            question,
            description,
            options: optionsList,
            multipleChoice,
            anonymous,
            endsAt,
          });

          const results = options.map(opt => ({
            option: opt,
            voteCount: 0,
            percentage: 0,
            voters: [] as string[],
          }));

          const embed = buildPollEmbedBuilder(poll, options, results);

          await interaction.editReply({
            embeds: [embed],
          });

          break;
        }

        case 'list': {
          await interaction.deferReply();

          const polls = await listPollsByGuild(guildId);

          if (polls.length === 0) {
            const embed = new EmbedBuilder()
              .setTitle('📊 Polls')
              .setDescription('No active polls found.')
              .setColor(Colors.Greyple);
            await interaction.editReply({ embeds: [embed] });
            return;
          }

          const fields: APIEmbedField[] = polls.map(p => ({
            name: `${getStatusEmoji(p.status)} ${p.question.substring(0, 100)}`,
            value: `ID: ${p.id} | Status: ${p.status} | Created: <t:${Math.floor(new Date(p.created_at).getTime() / 1000)}:R>`,
            inline: false,
          }));

          const embed = new EmbedBuilder()
            .setTitle('📊 Polls')
            .setColor(Colors.Blue)
            .addFields(fields)
            .setFooter({ text: `Total: ${polls.length} poll(s)` });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'info': {
          await interaction.deferReply();

          const pollId = interaction.options.getInteger('poll_id', true);
          const poll = await getPollById(pollId, guildId);
          const options = await pollRepository.getOptions(pollId);
          const results = await getPollResults(pollId, guildId);

          const embed = buildPollEmbedBuilder(poll, options, results);
          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'end': {
          await interaction.deferReply();

          const pollId = interaction.options.getInteger('poll_id', true);

          await endPoll(pollId, guildId, interaction.user.id, hasManageGuild, BOT_OWNERS);

          const embed = new EmbedBuilder()
            .setTitle('📊 Poll Ended')
            .setDescription(`Poll #${pollId} has been ended.`)
            .setColor(Colors.Gold);

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'cancel': {
          await interaction.deferReply();

          const pollId = interaction.options.getInteger('poll_id', true);

          await cancelPoll(pollId, guildId, hasManageGuild);

          const embed = new EmbedBuilder()
            .setTitle('📊 Poll Cancelled')
            .setDescription(`Poll #${pollId} has been cancelled.`)
            .setColor(Colors.Greyple);

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'results': {
          await interaction.deferReply();

          const pollId = interaction.options.getInteger('poll_id', true);

          const poll = await getPollById(pollId, guildId);
          const options = await pollRepository.getOptions(pollId);
          const results = await getPollResults(pollId, guildId);

          const embed = buildPollEmbedBuilder(poll, options, results);
          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      logError(`Error executing poll command in guild ${guildId}`, error);

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
