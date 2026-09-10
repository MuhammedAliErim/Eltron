import { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import {
  createTag,
  getTag,
  deleteTag,
  listTags,
  updateTagContent,
  addTagAlias,
  useTag,
} from '../../services/tag/TagService';
import { logError } from '../../utils/logger';
import { GuildOnlyError, BusinessRuleError } from '../../utils/errors';

export default class TagCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Manage custom tags')
    .setDefaultMemberPermissions(0)
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a new tag')
      .addStringOption(opt => opt.setName('name').setDescription('Tag name (lowercase, no spaces, max 50)').setRequired(true).setMaxLength(50))
      .addStringOption(opt => opt.setName('content').setDescription('Tag content').setRequired(true).setMaxLength(2000))
    )
    .addSubcommand(sub => sub
      .setName('get')
      .setDescription('Get a tag\'s content')
      .addStringOption(opt => opt.setName('name').setDescription('Tag name or alias').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('delete')
      .setDescription('Delete a tag')
      .addStringOption(opt => opt.setName('name').setDescription('Tag name').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all tags')
      .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setMinValue(1))
    )
    .addSubcommand(sub => sub
      .setName('edit')
      .setDescription('Edit a tag\'s content')
      .addStringOption(opt => opt.setName('name').setDescription('Tag name').setRequired(true))
      .addStringOption(opt => opt.setName('content').setDescription('New content').setRequired(true).setMaxLength(2000))
    )
    .addSubcommand(sub => sub
      .setName('alias')
      .setDescription('Add an alias to a tag')
      .addStringOption(opt => opt.setName('name').setDescription('Tag name').setRequired(true))
      .addStringOption(opt => opt.setName('alias').setDescription('Alias to add').setRequired(true).setMaxLength(50))
    );

  category = 'Utility';
  cooldown = 3;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guildId) throw new GuildOnlyError();
    const guildId = interaction.guildId;

    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'create': {
          await interaction.deferReply();

          const name = interaction.options.getString('name', true);
          const content = interaction.options.getString('content', true);

          const tag = await createTag(guildId, name, content, [], interaction.user.id);

          const embed = new EmbedBuilder()
            .setTitle('🏷️ Tag Created')
            .setDescription(`Tag \`${tag.name}\` has been created.`)
            .addFields(
              { name: 'Name', value: tag.name, inline: true },
              { name: 'Created By', value: `<@${tag.created_by}>`, inline: true },
            )
            .setColor(Colors.Green)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'get': {
          const name = interaction.options.getString('name', true);

          const tag = await useTag(guildId, name);

          await interaction.reply({ content: tag.content });
          break;
        }

        case 'delete': {
          await interaction.deferReply();

          const name = interaction.options.getString('name', true);

          const existingTag = await getTag(guildId, name);
          if (!existingTag) {
            throw new BusinessRuleError(`Tag \`${name}\` not found`);
          }

          const member = await interaction.guild?.members.fetch(interaction.user.id);
          const isOwner = existingTag.created_by === interaction.user.id;
          const hasManageGuild = member?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;

          if (!isOwner && !hasManageGuild) {
            throw new BusinessRuleError('You can only delete tags you created, or have Manage Server permission');
          }

          await deleteTag(guildId, name);

          const embed = new EmbedBuilder()
            .setTitle('🏷️ Tag Deleted')
            .setDescription(`Tag \`${name}\` has been deleted.`)
            .setColor(Colors.Red)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'list': {
          await interaction.deferReply();

          const page = interaction.options.getInteger('page') ?? 1;
          const result = await listTags(guildId, page);

          if (result.tags.length === 0) {
            const embed = new EmbedBuilder()
              .setTitle('🏷️ Tags')
              .setDescription('No tags found for this server.')
              .setColor(Colors.Greyple);
            await interaction.editReply({ embeds: [embed] });
            return;
          }

          const tagList = result.tags.map(t => {
            const aliases = t.aliases.length > 0 ? ` *(aliases: ${t.aliases.join(', ')})*` : '';
            return `\`${t.name}\` — used ${t.use_count} time(s)${aliases}`;
          }).join('\n');

          const embed = new EmbedBuilder()
            .setTitle('🏷️ Tags')
            .setDescription(tagList)
            .setColor(Colors.Blurple)
            .setFooter({ text: `Page ${result.page}/${result.totalPages} • ${result.total} total tag(s)` })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'edit': {
          await interaction.deferReply();

          const name = interaction.options.getString('name', true);
          const content = interaction.options.getString('content', true);

          const existingTag = await getTag(guildId, name);
          if (!existingTag) {
            throw new BusinessRuleError(`Tag \`${name}\` not found`);
          }

          const member = await interaction.guild?.members.fetch(interaction.user.id);
          const isOwner = existingTag.created_by === interaction.user.id;
          const hasManageGuild = member?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;

          if (!isOwner && !hasManageGuild) {
            throw new BusinessRuleError('You can only edit tags you created, or have Manage Server permission');
          }

          await updateTagContent(guildId, name, content);

          const embed = new EmbedBuilder()
            .setTitle('🏷️ Tag Edited')
            .setDescription(`Tag \`${name}\` has been updated.`)
            .setColor(Colors.Blue)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'alias': {
          await interaction.deferReply();

          const name = interaction.options.getString('name', true);
          const alias = interaction.options.getString('alias', true);

          const updated = await addTagAlias(guildId, name, alias);

          const embed = new EmbedBuilder()
            .setTitle('🏷️ Alias Added')
            .setDescription(`Alias \`${alias}\` has been added to tag \`${updated.name}\`.`)
            .addFields(
              { name: 'Tag', value: updated.name, inline: true },
              { name: 'Aliases', value: updated.aliases.join(', ') || 'None', inline: true },
            )
            .setColor(Colors.Green)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      logError(`Error executing tag command in guild ${guildId}`, error);

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
