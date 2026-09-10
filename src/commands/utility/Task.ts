import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, Colors, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import {
  ScheduledTaskRepository,
  ScheduledTaskRow,
} from '../../database/repositories/ScheduledTaskRepository';
import {
  startTask,
  stopTask,
  isTaskRunning,
  calculateNextRun,
} from '../../services/task/ScheduledTaskService';
import { GuildOnlyError, ValidationError } from '../../utils/errors';
import { logError } from '../../utils/logger';

const taskRepository = new ScheduledTaskRepository();

const TASK_TYPE_CHOICES = [
  { name: 'Backup', value: 'backup' },
  { name: 'Reminder', value: 'reminder' },
  { name: 'Announce', value: 'announce' },
  { name: 'Cleanup', value: 'cleanup' },
];

function formatInterval(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export default class TaskCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('task')
    .setDescription('Manage scheduled tasks')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a new scheduled task')
      .addStringOption(opt => opt.setName('name').setDescription('Task name').setRequired(true).setMaxLength(100))
      .addStringOption(opt => opt.setName('type').setDescription('Task type').setRequired(true).addChoices(...TASK_TYPE_CHOICES))
      .addIntegerOption(opt => opt.setName('interval').setDescription('Interval in minutes (min 5)').setRequired(true).setMinValue(5))
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a scheduled task')
      .addStringOption(opt => opt.setName('id').setDescription('Task ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all scheduled tasks')
    )
    .addSubcommand(sub => sub
      .setName('enable')
      .setDescription('Enable a scheduled task')
      .addStringOption(opt => opt.setName('id').setDescription('Task ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('disable')
      .setDescription('Disable a scheduled task')
      .addStringOption(opt => opt.setName('id').setDescription('Task ID').setRequired(true))
    );

  category = 'Utility';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ManageGuild];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guildId) throw new GuildOnlyError();
    const guildId = interaction.guildId;

    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'create': {
          await interaction.deferReply();

          const name = interaction.options.getString('name', true);
          const type = interaction.options.getString('type', true);
          const intervalMinutes = interaction.options.getInteger('interval', true);
          const intervalMs = intervalMinutes * 60 * 1000;

          const nextRun = calculateNextRun(intervalMs);

          const task = await taskRepository.create({
            guild_id: guildId,
            name,
            type,
            interval_ms: intervalMs,
            created_by: interaction.user.id,
          });

          startTask({ ...task, enabled: true, interval_ms: intervalMs });

          const embed = new EmbedBuilder()
            .setTitle('✅ Scheduled Task Created')
            .addFields(
              { name: 'Name', value: name, inline: true },
              { name: 'Type', value: type, inline: true },
              { name: 'Interval', value: formatInterval(intervalMs), inline: true },
              { name: 'ID', value: task.id, inline: true },
              { name: 'Next Run', value: `<t:${Math.floor(nextRun.getTime() / 1000)}:R>`, inline: true },
            )
            .setColor(Colors.Green)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'remove': {
          await interaction.deferReply();

          const id = interaction.options.getString('id', true);
          const task = await taskRepository.getById(id);

          if (!task) {
            throw new ValidationError('Task not found');
          }

          if (task.guild_id !== guildId) {
            throw new ValidationError('Task not found');
          }

          stopTask(id);
          await taskRepository.delete(id);

          const embed = new EmbedBuilder()
            .setTitle('🗑️ Scheduled Task Removed')
            .setDescription(`Task **${task.name}** has been removed.`)
            .setColor(Colors.Greyple)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'list': {
          await interaction.deferReply();

          const tasks = await taskRepository.getByGuild(guildId);

          if (tasks.length === 0) {
            const embed = new EmbedBuilder()
              .setTitle('📋 Scheduled Tasks')
              .setDescription('No scheduled tasks for this server.')
              .setColor(Colors.Greyple);
            await interaction.editReply({ embeds: [embed] });
            return;
          }

          const fields = tasks.map(task => {
            const status = task.enabled ? (isTaskRunning(task.id) ? '🟢 Running' : '🟡 Enabled') : '🔴 Disabled';
            const lastRun = task.last_run
              ? `<t:${Math.floor(new Date(task.last_run).getTime() / 1000)}:R>`
              : 'Never';
            const nextRun = task.next_run && task.enabled
              ? `<t:${Math.floor(new Date(task.next_run).getTime() / 1000)}:R>`
              : 'N/A';
            const interval = task.interval_ms ? formatInterval(task.interval_ms) : 'N/A';

            return {
              name: `${task.name} (${task.type})`,
              value: `**ID:** \`${task.id}\`\n**Status:** ${status}\n**Interval:** ${interval}\n**Last Run:** ${lastRun}\n**Next Run:** ${nextRun}`,
              inline: false,
            };
          });

          const embed = new EmbedBuilder()
            .setTitle('📋 Scheduled Tasks')
            .setColor(Colors.Blue)
            .addFields(fields)
            .setFooter({ text: `Total: ${tasks.length} task(s)` })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'enable': {
          await interaction.deferReply();

          const id = interaction.options.getString('id', true);
          const task = await taskRepository.getById(id);

          if (!task) {
            throw new ValidationError('Task not found');
          }

          if (task.guild_id !== guildId) {
            throw new ValidationError('Task not found');
          }

          if (task.enabled) {
            throw new ValidationError('Task is already enabled');
          }

          const nextRun = task.interval_ms ? calculateNextRun(task.interval_ms) : new Date();
          await taskRepository.update(id, {
            enabled: true,
            next_run: nextRun.toISOString(),
          });

          if (task.interval_ms) {
            startTask({ ...task, enabled: true, interval_ms: task.interval_ms });
          }

          const embed = new EmbedBuilder()
            .setTitle('✅ Task Enabled')
            .setDescription(`Task **${task.name}** has been enabled.`)
            .setColor(Colors.Green)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'disable': {
          await interaction.deferReply();

          const id = interaction.options.getString('id', true);
          const task = await taskRepository.getById(id);

          if (!task) {
            throw new ValidationError('Task not found');
          }

          if (task.guild_id !== guildId) {
            throw new ValidationError('Task not found');
          }

          if (!task.enabled) {
            throw new ValidationError('Task is already disabled');
          }

          await taskRepository.update(id, { enabled: false });
          stopTask(id);

          const embed = new EmbedBuilder()
            .setTitle('🔴 Task Disabled')
            .setDescription(`Task **${task.name}** has been disabled.`)
            .setColor(Colors.Greyple)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      logError(`Error executing task command in guild ${guildId}`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const reply = { content: `❌ ${errorMessage}`, flags: MessageFlags.Ephemeral };

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
}
