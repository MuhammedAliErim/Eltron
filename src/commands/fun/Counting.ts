import { SlashCommandBuilder, EmbedBuilder, Colors, ChannelType, PermissionFlagsBits } from 'discord.js';
import { Command, type CommandExecuteOptions } from '../../structures/Command';
import { CountingRepository } from '../../database/repositories/CountingRepository';
import { logError } from '../../utils/logger';
import { GuildOnlyError, ValidationError } from '../../utils/errors';

const repo = new CountingRepository();

export default class CountingCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('counting')
    .setDescription('Manage counting game')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Set up counting in a channel')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel for counting')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('config')
        .setDescription('Update counting configuration')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('Enable/disable counting').setRequired(false)
        )
        .addBooleanOption(opt =>
          opt
            .setName('reset_on_fail')
            .setDescription('Reset count on wrong number')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('leaderboard')
        .setDescription('Show counting leaderboard')
        .addIntegerOption(opt =>
          opt.setName('page').setDescription('Page number').setRequired(false).setMinValue(1)
        )
    )
    .addSubcommand(sub => sub.setName('reset').setDescription('Reset current count to 0'));

  category = 'Fun';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guildId) throw new GuildOnlyError();

    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'setup': {
          await interaction.deferReply();

          const channel = interaction.options.getChannel('channel', true);
          if (channel.type !== ChannelType.GuildText) {
            throw new ValidationError('Please select a text channel');
          }

          const existing = await repo.getConfigByChannel(channel.id);
          if (existing) {
            throw new ValidationError('Counting is already set up in this channel');
          }

          await repo.createConfig(interaction.guildId, channel.id);

          const embed = new EmbedBuilder()
            .setDescription(`Counting has been set up in <#${channel.id}>`)
            .setColor(Colors.Green);

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'config': {
          await interaction.deferReply();

          const enabled = interaction.options.getBoolean('enabled');
          const resetOnFail = interaction.options.getBoolean('reset_on_fail');

          const config = await repo.getConfig(interaction.guildId);
          if (!config) {
            throw new ValidationError('Counting is not set up in this server. Use `/counting setup` first.');
          }

          const updates: { enabled?: boolean; reset_on_fail?: boolean } = {};
          if (enabled !== null) updates.enabled = enabled;
          if (resetOnFail !== null) updates.reset_on_fail = resetOnFail;

          if (Object.keys(updates).length === 0) {
            throw new ValidationError('Please provide at least one option to update');
          }

          await repo.updateConfig(interaction.guildId, updates);

          const embed = new EmbedBuilder()
            .setDescription('Counting configuration updated')
            .setColor(Colors.Green);

          if (enabled !== null) embed.addFields({ name: 'Enabled', value: enabled ? 'Yes' : 'No', inline: true });
          if (resetOnFail !== null)
            embed.addFields({ name: 'Reset on Fail', value: resetOnFail ? 'Yes' : 'No', inline: true });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'leaderboard': {
          await interaction.deferReply();

          const page = interaction.options.getInteger('page') || 1;
          const scores = await repo.getScores(interaction.guildId, page);

          if (scores.length === 0) {
            const embed = new EmbedBuilder()
              .setTitle('📊 Counting Leaderboard')
              .setDescription('No scores yet.')
              .setColor(Colors.Greyple);

            await interaction.editReply({ embeds: [embed] });
            return;
          }

          const fields = scores.map((score, index) => ({
            name: `#${(page - 1) * 10 + index + 1}`,
            value: `<@${score.user_id}> - ${score.correct_count} correct | Best streak: ${score.best_streak}`,
            inline: false,
          }));

          const embed = new EmbedBuilder()
            .setTitle('📊 Counting Leaderboard')
            .setColor(Colors.Gold)
            .addFields(fields)
            .setFooter({ text: `Page ${page}` });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'reset': {
          await interaction.deferReply();

          const config = await repo.getConfig(interaction.guildId);
          if (!config) {
            throw new ValidationError('Counting is not set up in this server. Use `/counting setup` first.');
          }

          await repo.updateConfig(interaction.guildId, {
            current_number: 0,
            last_user_id: null,
          });

          const embed = new EmbedBuilder()
            .setDescription('Count has been reset to 0')
            .setColor(Colors.Green);

          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      logError(`Error executing counting command in guild ${interaction.guildId}`, error);

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
