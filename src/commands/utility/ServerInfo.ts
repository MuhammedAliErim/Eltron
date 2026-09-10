import { SlashCommandBuilder, EmbedBuilder, Colors, ChannelType } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class ServerInfoCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Shows detailed information about the server.');

  category = 'Utility';
  cooldown = 10;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const guild = interaction.guild!;
    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;

    const totalMembers = guild.memberCount;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    const humans = totalMembers - bots;

    const verificationLevels: Record<number, string> = {
      0: 'None',
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Very High',
    };

    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount ?? 0;

    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setColor(Colors.Blurple)
      .setThumbnail(guild.iconURL({ size: 1024 }))
      .addFields(
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Created At', value: `<t:${createdTimestamp}:F>`, inline: true },
        {
          name: 'Members',
          value: `Total: ${totalMembers}\nHumans: ${humans}\nBots: ${bots}`,
          inline: true,
        },
        {
          name: 'Channels',
          value: `Text: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categories}`,
          inline: true,
        },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Emojis', value: `${guild.emojis.cache.size}`, inline: true },
        { name: 'Boost Level', value: `${boostLevel}`, inline: true },
        { name: 'Boosts', value: `${boostCount}`, inline: true },
        {
          name: 'Verification Level',
          value: verificationLevels[guild.verificationLevel] ?? 'Unknown',
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: 'Eltron Bot' });

    if (guild.description) {
      embed.setDescription(guild.description);
    }

    await interaction.reply({ embeds: [embed] });
  }
}
