import {
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type APIEmbedField,
  type InteractionReplyOptions,
  type InteractionEditReplyOptions,
  type InteractionUpdateOptions,
} from 'discord.js';

const ELTRON_COLOR = 0x5865f2;
const ELTRON_URL = 'https://github.com/MuhammedAliErim/Eltron';

export const successEmbed = (title: string, description?: string): EmbedBuilder =>
  new EmbedBuilder()
    .setTitle(title)
    .setColor(Colors.Green)
    .setDescription(description ?? null)
    .setTimestamp();

export const errorEmbed = (title: string, description?: string): EmbedBuilder =>
  new EmbedBuilder()
    .setTitle(title)
    .setColor(Colors.Red)
    .setDescription(description ?? null)
    .setTimestamp();

export const warningEmbed = (title: string, description?: string): EmbedBuilder =>
  new EmbedBuilder()
    .setTitle(title)
    .setColor(Colors.Yellow)
    .setDescription(description ?? null)
    .setTimestamp();

export const infoEmbed = (title: string, description?: string): EmbedBuilder =>
  new EmbedBuilder()
    .setTitle(title)
    .setColor(ELTRON_COLOR)
    .setDescription(description ?? null)
    .setTimestamp();

export const eltronEmbed = (): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(ELTRON_COLOR)
    .setTimestamp()
    .setFooter({ text: 'Eltron', url: ELTRON_URL });

export const field = (name: string, value: string, inline = true): APIEmbedField => ({
  name,
  value: value || '\u200b',
  inline,
});

export const reply = {
  success: (content: string): InteractionReplyOptions => ({
    content,
    flags: MessageFlags.Ephemeral,
  }),
  error: (content: string): InteractionReplyOptions => ({
    content: `❌ ${content}`,
    flags: MessageFlags.Ephemeral,
  }),
  embed: (embed: EmbedBuilder): InteractionReplyOptions => ({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  }),
  embedPublic: (embed: EmbedBuilder): InteractionReplyOptions => ({
    embeds: [embed],
  }),
};

export const editReply = {
  success: (content: string): InteractionEditReplyOptions => ({
    content,
  }),
  error: (content: string): InteractionEditReplyOptions => ({
    content: `❌ ${content}`,
  }),
  embed: (embed: EmbedBuilder): InteractionEditReplyOptions => ({
    embeds: [embed],
  }),
};

export const updateReply = {
  embed: (embed: EmbedBuilder): InteractionUpdateOptions => ({
    embeds: [embed],
  }),
  embedsComponents: (embeds: EmbedBuilder[], components: InteractionUpdateOptions['components']): InteractionUpdateOptions => ({
    embeds,
    components,
  }),
};

export const categorySelectMenu = (
  customId: string,
  categories: { label: string; value: string; description?: string; emoji?: string }[],
): ActionRowBuilder<StringSelectMenuBuilder> =>
  new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Select a category...')
      .addOptions(
        categories.map((c) => ({
          label: c.label,
          value: c.value,
          description: c.description,
          emoji: c.emoji,
        })),
      ),
  );

export const backButton = (customId: string = 'help:back'): ActionRowBuilder<ButtonBuilder> =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(customId)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️'),
  );

export const HELP_CATEGORIES = [
  { label: 'Moderation', value: 'Moderation', emoji: '🛡️', description: 'Ban, kick, timeout, warn, and more' },
  { label: 'Security', value: 'Security', emoji: '🔒', description: 'Automod, anti-raid, quarantine, verification' },
  { label: 'Server Management', value: 'Server Management', emoji: '⚙️', description: 'Roles, welcome, goodbye, auto-role, channel warnings' },
  { label: 'Staff', value: 'Staff', emoji: '👥', description: 'Staff management, applications, tickets' },
  { label: 'Events & Giveaways', value: 'Events & Giveaways', emoji: '🎉', description: 'Events, giveaways, polls' },
  { label: 'Level & Economy', value: 'Level & Economy', emoji: '⭐', description: 'XP, levels, leaderboards' },
  { label: 'Utility', value: 'Utility', emoji: '🔧', description: 'Ping, bot info, help, reminders, analytics' },
] as const;

export type HelpCategory = (typeof HELP_CATEGORIES)[number]['value'];

export const COMMAND_CATEGORIES: Record<string, HelpCategory> = {
  ban: 'Moderation',
  kick: 'Moderation',
  timeout: 'Moderation',
  unban: 'Moderation',
  untimeout: 'Moderation',
  warn: 'Moderation',
  unwarn: 'Moderation',
  warnings: 'Moderation',
  automod: 'Security',
  antiraid: 'Security',
  quarantine: 'Security',
  verification: 'Security',
  verify: 'Security',
  channelwarning: 'Security',
  role: 'Server Management',
  autorole: 'Server Management',
  welcome: 'Server Management',
  goodbye: 'Server Management',
  staff: 'Staff',
  application: 'Staff',
  ticket: 'Staff',
  event: 'Events & Giveaways',
  giveaway: 'Events & Giveaways',
  poll: 'Events & Giveaways',
  level: 'Level & Economy',
  analytics: 'Utility',
  reminder: 'Utility',
  botinfo: 'Utility',
  ping: 'Utility',
  help: 'Utility',
};
