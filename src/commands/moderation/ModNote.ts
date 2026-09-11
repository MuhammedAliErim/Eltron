import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  Colors,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { ModNoteRepository } from '../../database/repositories/ModNoteRepository';

const repo = new ModNoteRepository();

export default class ModNoteCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('modnote')
    .setDescription('Add notes to a user\'s moderation record')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a note to a user')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to add note for').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('note').setDescription('Note content (max 500)').setRequired(true).setMaxLength(500)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('View notes for a user')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to view notes for').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a note by ID')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Note ID to remove').setRequired(true)
        )
    );

  category = 'Moderation';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ManageGuild];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add':
        return this.handleAdd(interaction);
      case 'view':
        return this.handleView(interaction);
      case 'remove':
        return this.handleRemove(interaction);
    }
  }

  private async handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = interaction.options.getUser('user', true);
    const note = interaction.options.getString('note', true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const created = await repo.add({
      guild_id: interaction.guildId!,
      user_id: user.id,
      moderator_id: interaction.user.id,
      note,
    });

    const embed = new EmbedBuilder()
      .setTitle('📝 Mod Note Added')
      .setDescription(`Note added to <@${user.id}>'s record.`)
      .addFields(
        { name: 'Note ID', value: created.id, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Content', value: note },
      )
      .setColor(Colors.Green)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleView(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = interaction.options.getUser('user', true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const notes = await repo.getByUser(interaction.guildId!, user.id);

    if (notes.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('📝 Mod Notes')
        .setDescription(`No notes found for <@${user.id}>.`)
        .setColor(Colors.Greyple);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const fields = notes.map((n) => ({
      name: `#${n.id} — ${new Date(n.created_at).toLocaleDateString()}`,
      value: `> ${n.note}\nBy: <@${moderator_id(n.moderator_id)}>`,
      inline: false,
    }));

    const embed = new EmbedBuilder()
      .setTitle(`📝 Mod Notes — ${user.tag}`)
      .setColor(Colors.Blue)
      .addFields(fields)
      .setFooter({ text: `Total: ${notes.length} note(s)` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
    const id = interaction.options.getString('id', true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const deleted = await repo.delete(id);

    if (!deleted) {
      await interaction.editReply({ content: 'Note not found.' });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('📝 Mod Note Removed')
      .setDescription(`Note \`${id}\` has been removed.`)
      .setColor(Colors.Greyple)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}

function moderator_id(id: string): string {
  return `<@${id}>`;
}
