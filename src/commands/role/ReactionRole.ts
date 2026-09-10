import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import {
  createReactionRole,
  removeReactionRole,
  listReactionRoles,
} from '../../services/reaction-role/ReactionRoleService';

export default class ReactionRoleCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Manage reaction roles')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a reaction role')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel to send the message').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('title').setDescription('Embed title').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('emoji').setDescription('Emoji for the reaction').setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to assign').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('description').setDescription('Embed description').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('color').setDescription('Embed color (hex)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a reaction role')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Reaction role ID').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all reaction roles')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

  category = 'Roles';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ManageRoles];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'create':
        return this.handleCreate(interaction);
      case 'remove':
        return this.handleRemove(interaction);
      case 'list':
        return this.handleList(interaction);
    }
  }

  private async handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;

    const botMember = guild.members.me;
    if (!botMember) {
      await interaction.editReply({ content: 'Bot member not found.' });
      return;
    }

    const channel = interaction.options.getChannel('channel', true);
    const title = interaction.options.getString('title', true);
    const emoji = interaction.options.getString('emoji', true);
    const role = interaction.options.getRole('role', true);
    const description = interaction.options.getString('description') || undefined;
    const color = interaction.options.getString('color') || undefined;

    const targetChannel = guild.channels.cache.get(channel.id) as TextChannel | undefined;
    if (!targetChannel) {
      await interaction.editReply({ content: 'Channel not found.' });
      return;
    }

    const botPermissions = targetChannel.permissionsFor(botMember);
    if (!botPermissions?.has('SendMessages') || !botPermissions?.has('AddReactions') || !botPermissions?.has('UseExternalEmojis')) {
      await interaction.editReply({ content: 'I need SendMessages, AddReactions, and UseExternalEmojis permissions in that channel.' });
      return;
    }

    const targetRole = guild.roles.cache.get(role.id);
    if (!targetRole) {
      await interaction.editReply({ content: 'Role not found.' });
      return;
    }

    if (targetRole.position >= botMember.roles.highest.position) {
      await interaction.editReply({ content: 'I cannot assign this role because it is higher than or equal to my highest role.' });
      return;
    }

    if (targetRole.managed) {
      await interaction.editReply({ content: 'I cannot assign managed roles.' });
      return;
    }

    try {
      const reactionRole = await createReactionRole(
        guild,
        channel.id,
        title,
        description,
        color,
        emoji,
        role.id,
        interaction.user.id
      );

      await interaction.editReply({
        content: `Reaction role created! ID: \`${reactionRole.id}\`\nMessage: <#${channel.id}>`,
      });
    } catch (error) {
      await interaction.editReply({ content: 'Failed to create reaction role. Check bot permissions and try again.' });
    }
  }

  private async handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
    const id = interaction.options.getString('id', true);

    try {
      const removed = await removeReactionRole(interaction.guild!, id);

      if (!removed) {
        await interaction.editReply({ content: 'Reaction role not found.' });
        return;
      }

      await interaction.editReply({ content: 'Reaction role removed.' });
    } catch (error) {
      await interaction.editReply({ content: 'Failed to remove reaction role.' });
    }
  }

  private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
    const reactionRoles = await listReactionRoles(interaction.guild!.id);

    if (reactionRoles.length === 0) {
      await interaction.editReply({ content: 'No reaction roles found.' });
      return;
    }

    const lines = reactionRoles.map((rr) => {
      const uses = rr.max_uses > 0 ? `${rr.current_uses}/${rr.max_uses}` : rr.current_uses.toString();
      return `**${rr.title}** — ${rr.emoji} → <@&${rr.role_id}> — ${uses} uses — ID: \`${rr.id}\``;
    });

    const chunks: string[] = [];
    let current = '';
    for (const line of lines) {
      if (current.length + line.length + 1 > 2000) {
        chunks.push(current);
        current = line;
      } else {
        current = current ? `${current}\n${line}` : line;
      }
    }
    if (current) chunks.push(current);

    await interaction.editReply({ content: chunks[0] });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i], flags: MessageFlags.Ephemeral });
    }
  }
}
