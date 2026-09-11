import { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import {
  createCustomCommand,
  updateCustomCommand,
  deleteCustomCommand,
  getAllCustomCommands,
  getCustomCommandByName,
  getCustomCommandsPaginated,
} from '../../services/custom-command/CustomCommandService';
import { logError } from '../../utils/logger';
import { GuildOnlyError, BusinessRuleError } from '../../utils/errors';

const COMMAND_NAME_REGEX = /^[a-z0-9_]+$/;
const MAX_COMMAND_NAME_LENGTH = 30;
const MAX_RESPONSE_LENGTH = 2000;
const COMMANDS_PER_PAGE = 10;

export default class CustomCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('customcommand')
    .setDescription('Manage custom commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a new custom command')
      .addStringOption(opt => opt.setName('name').setDescription('Command name (lowercase, alphanumeric, underscores only)').setRequired(true).setMaxLength(MAX_COMMAND_NAME_LENGTH))
      .addStringOption(opt => opt.setName('response').setDescription('Command response text').setRequired(true).setMaxLength(MAX_RESPONSE_LENGTH))
      .addStringOption(opt => opt.setName('description').setDescription('Command description').setMaxLength(100))
      .addStringOption(opt => opt.setName('aliases').setDescription('Comma-separated aliases'))
      .addStringOption(opt => opt.setName('embed_color').setDescription('Hex color for embed (e.g. #FF0000)'))
    )
    .addSubcommand(sub => sub
      .setName('edit')
      .setDescription('Edit an existing custom command')
      .addStringOption(opt => opt.setName('name').setDescription('Command name').setRequired(true))
      .addStringOption(opt => opt.setName('response').setDescription('New response text').setMaxLength(MAX_RESPONSE_LENGTH))
      .addStringOption(opt => opt.setName('description').setDescription('New description'))
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable the command'))
      .addStringOption(opt => opt.setName('aliases').setDescription('Comma-separated aliases'))
      .addStringOption(opt => opt.setName('embed_color').setDescription('Hex color for embed (or empty to remove)'))
    )
    .addSubcommand(sub => sub
      .setName('delete')
      .setDescription('Delete a custom command')
      .addStringOption(opt => opt.setName('name').setDescription('Command name').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all custom commands')
      .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setMinValue(1))
    )
    .addSubcommand(sub => sub
      .setName('info')
      .setDescription('Get info about a custom command')
      .addStringOption(opt => opt.setName('name').setDescription('Command name').setRequired(true))
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

          const name = interaction.options.getString('name', true).toLowerCase().trim();
          const response = interaction.options.getString('response', true);
          const description = interaction.options.getString('description') ?? '';
          const aliasesStr = interaction.options.getString('aliases') ?? '';
          const embedColor = interaction.options.getString('embed_color') ?? undefined;

          if (!COMMAND_NAME_REGEX.test(name)) {
            throw new BusinessRuleError('Command name can only contain lowercase letters, numbers, and underscores');
          }

          if (name.length > MAX_COMMAND_NAME_LENGTH) {
            throw new BusinessRuleError(`Command name must be ${MAX_COMMAND_NAME_LENGTH} characters or less`);
          }

          if (response.length > MAX_RESPONSE_LENGTH) {
            throw new BusinessRuleError(`Response must be ${MAX_RESPONSE_LENGTH} characters or less`);
          }

          const aliases = aliasesStr
            .split(',')
            .map(a => a.toLowerCase().trim())
            .filter(a => a.length > 0 && COMMAND_NAME_REGEX.test(a));

          const command = await createCustomCommand(guildId, name, response, {
            description,
            aliases,
            embed_color: embedColor,
            created_by: interaction.user.id,
          });

          const embed = new EmbedBuilder()
            .setTitle('Custom Command Created')
            .setDescription(`Command \`${command.name}\` has been created.`)
            .addFields(
              { name: 'Name', value: command.name, inline: true },
              { name: 'Created By', value: `<@${command.created_by}>`, inline: true },
              { name: 'Usage', value: `\`${command.name}\``, inline: false },
            )
            .setColor(Colors.Green)
            .setTimestamp();

          if (command.description) {
            embed.addFields({ name: 'Description', value: command.description, inline: false });
          }

          embed.addFields({
            name: 'Available Variables',
            value: [
              '`{user}` - mention the user',
              '`{username}` - display name',
              '`{server}` - server name',
              '`{channel}` - channel mention',
              '`{date}` - current date',
              '`{time}` - current time',
              '`{args}` - all arguments',
              '`{arg1}`, `{arg2}` - individual args',
              '`{random:X:Y}` - random number X to Y',
              '`{rolecount}` - member count',
              '`{online}` - online count',
            ].join('\n'),
            inline: false,
          });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'edit': {
          await interaction.deferReply();

          const name = interaction.options.getString('name', true).toLowerCase().trim();
          const response = interaction.options.getString('response') ?? undefined;
          const description = interaction.options.getString('description') ?? undefined;
          const enabled = interaction.options.getBoolean('enabled') ?? undefined;
          const aliasesStr = interaction.options.getString('aliases') ?? undefined;
          const embedColor = interaction.options.getString('embed_color') ?? undefined;

          const existing = await getCustomCommandByName(guildId, name);
          if (!existing) {
            throw new BusinessRuleError(`Custom command \`${name}\` not found`);
          }

          const updates: Parameters<typeof updateCustomCommand>[2] = {};

          if (response !== undefined) {
            if (response.length > MAX_RESPONSE_LENGTH) {
              throw new BusinessRuleError(`Response must be ${MAX_RESPONSE_LENGTH} characters or less`);
            }
            updates.response = response;
          }

          if (description !== undefined) updates.description = description;
          if (enabled !== undefined) updates.enabled = enabled;

          if (aliasesStr !== undefined) {
            const aliases = aliasesStr
              .split(',')
              .map(a => a.toLowerCase().trim())
              .filter(a => a.length > 0 && COMMAND_NAME_REGEX.test(a));
            updates.aliases = aliases;
          }

          if (embedColor !== undefined) {
            updates.embed_color = embedColor || null;
          }

          const updated = await updateCustomCommand(guildId, name, updates);

          const embed = new EmbedBuilder()
            .setTitle('Custom Command Updated')
            .setDescription(`Command \`${updated.name}\` has been updated.`)
            .setColor(Colors.Blue)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'delete': {
          await interaction.deferReply();

          const name = interaction.options.getString('name', true).toLowerCase().trim();

          await deleteCustomCommand(guildId, name);

          const embed = new EmbedBuilder()
            .setTitle('Custom Command Deleted')
            .setDescription(`Command \`${name}\` has been deleted.`)
            .setColor(Colors.Red)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'list': {
          await interaction.deferReply();

          const page = interaction.options.getInteger('page') ?? 1;
          const result = await getCustomCommandsPaginated(guildId, page, COMMANDS_PER_PAGE);

          if (result.commands.length === 0) {
            const embed = new EmbedBuilder()
              .setTitle('Custom Commands')
              .setDescription('No custom commands found for this server.')
              .setColor(Colors.Greyple);
            await interaction.editReply({ embeds: [embed] });
            return;
          }

          const totalPages = Math.max(1, Math.ceil(result.total / COMMANDS_PER_PAGE));
          const commandList = result.commands.map(c => {
            const status = c.enabled ? '✅' : '❌';
            const aliases = c.aliases.length > 0 ? ` *(aliases: ${c.aliases.join(', ')})*` : '';
            return `${status} \`${c.name}\` — ${c.description || 'No description'} — used ${c.use_count} time(s)${aliases}`;
          }).join('\n');

          const embed = new EmbedBuilder()
            .setTitle('Custom Commands')
            .setDescription(commandList)
            .setColor(Colors.Blurple)
            .setFooter({ text: `Page ${page}/${totalPages} • ${result.total} total command(s)` })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'info': {
          const name = interaction.options.getString('name', true).toLowerCase().trim();

          const command = await getCustomCommandByName(guildId, name);
          if (!command) {
            throw new BusinessRuleError(`Custom command \`${name}\` not found`);
          }

          const embed = new EmbedBuilder()
            .setTitle(`Custom Command: ${command.name}`)
            .setDescription(command.description || 'No description')
            .addFields(
              { name: 'Name', value: command.name, inline: true },
              { name: 'Enabled', value: command.enabled ? 'Yes' : 'No', inline: true },
              { name: 'Use Count', value: String(command.use_count), inline: true },
              { name: 'Cooldown', value: `${command.cooldown_seconds}s`, inline: true },
              { name: 'Permission', value: command.requires_permission || 'None', inline: true },
              { name: 'Embed Color', value: command.embed_color || 'None', inline: true },
              { name: 'DM Response', value: command.dm_response ? 'Yes' : 'No', inline: true },
              { name: 'Aliases', value: command.aliases.length > 0 ? command.aliases.join(', ') : 'None', inline: false },
              { name: 'Response', value: command.response.length > 1024 ? command.response.substring(0, 1021) + '...' : command.response, inline: false },
              { name: 'Created By', value: `<@${command.created_by}>`, inline: true },
              { name: 'Created At', value: `<t:${Math.floor(new Date(command.created_at).getTime() / 1000)}:R>`, inline: true },
            )
            .setColor(command.embed_color ? parseInt(command.embed_color.replace('#', ''), 16) : Colors.Blurple)
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      logError(`Error executing customcommand in guild ${guildId}`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const reply = { content: `❌ ${errorMessage}`, flags: MessageFlags.Ephemeral as number };

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
}
