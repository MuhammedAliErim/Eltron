import { GuildMember, EmbedBuilder, AttachmentBuilder } from 'discord.js';

const hexToDecimal = (hex: string): number => {
  const cleaned = hex.replace('#', '');
  return parseInt(cleaned, 16);
};

const generateWelcomeSvg = (
  username: string,
  avatarUrl: string,
  serverName: string,
  memberCount: number,
  color: string
): string => {
  const displayName = username.length > 16 ? username.slice(0, 16) + '...' : username;
  const serverDisplay = serverName.length > 20 ? serverName.slice(0, 20) + '...' : serverName;
  const bgColor = color || '#5865F2';
  const lightBg = bgColor + '33';

  return `<svg width="800" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
    </linearGradient>
    <clipPath id="circleClip">
      <circle cx="120" cy="150" r="70" />
    </clipPath>
  </defs>
  <rect width="800" height="300" rx="16" fill="url(#bg)" />
  <rect x="10" y="10" width="780" height="280" rx="12" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
  <circle cx="120" cy="150" r="74" fill="rgba(255,255,255,0.15)" />
  <circle cx="120" cy="150" r="70" fill="rgba(255,255,255,0.05)" />
  <image href="${avatarUrl}" x="50" y="80" width="140" height="140" clip-path="url(#circleClip)" />
  <text x="240" y="100" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white">Welcome to ${escapeXml(serverDisplay)}!</text>
  <text x="240" y="145" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.85)">Hey ${escapeXml(displayName)}, welcome to</text>
  <text x="240" y="175" font-family="Arial, sans-serif" font-size="20" fill="white" font-weight="bold">${escapeXml(serverDisplay)}</text>
  <text x="240" y="215" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)">You are member #${memberCount}</text>
  <rect x="240" y="240" width="120" height="30" rx="15" fill="rgba(255,255,255,0.15)" />
  <text x="300" y="260" font-family="Arial, sans-serif" font-size="13" fill="rgba(255,255,255,0.8)" text-anchor="middle">Enjoy your stay!</text>
</svg>`;
};

const generateGoodbyeSvg = (
  username: string,
  avatarUrl: string,
  serverName: string,
  memberCount: number,
  color: string
): string => {
  const displayName = username.length > 16 ? username.slice(0, 16) + '...' : username;
  const serverDisplay = serverName.length > 20 ? serverName.slice(0, 20) + '...' : serverName;
  const bgColor = color || '#ED4245';

  return `<svg width="800" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
    </linearGradient>
    <clipPath id="circleClip">
      <circle cx="120" cy="150" r="70" />
    </clipPath>
  </defs>
  <rect width="800" height="300" rx="16" fill="url(#bg)" />
  <rect x="10" y="10" width="780" height="280" rx="12" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
  <circle cx="120" cy="150" r="74" fill="rgba(255,255,255,0.15)" />
  <circle cx="120" cy="150" r="70" fill="rgba(255,255,255,0.05)" />
  <image href="${avatarUrl}" x="50" y="80" width="140" height="140" clip-path="url(#circleClip)" />
  <text x="240" y="100" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white">Goodbye ${escapeXml(displayName)}!</text>
  <text x="240" y="145" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.85)">We'll miss you!</text>
  <text x="240" y="175" font-family="Arial, sans-serif" font-size="20" fill="white">${escapeXml(serverDisplay)} now has</text>
  <text x="240" y="205" font-family="Arial, sans-serif" font-size="24" fill="white" font-weight="bold">${memberCount} members</text>
  <rect x="240" y="230" width="120" height="30" rx="15" fill="rgba(255,255,255,0.15)" />
  <text x="300" y="250" font-family="Arial, sans-serif" font-size="13" fill="rgba(255,255,255,0.8)" text-anchor="middle">See you again!</text>
</svg>`;
};

const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const generateWelcomeCard = async (
  member: GuildMember,
  embedColor?: string
): Promise<{ embed: EmbedBuilder; attachment?: AttachmentBuilder }> => {
  const color = embedColor || '#5865F2';
  const decimalColor = hexToDecimal(color);

  const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });

  const svgBuffer = Buffer.from(
    generateWelcomeSvg(
      member.user.username,
      avatarUrl,
      member.guild.name,
      member.guild.memberCount,
      color
    ),
    'utf-8'
  );

  const attachment = new AttachmentBuilder(svgBuffer, { name: 'welcome.png' });

  const embed = new EmbedBuilder()
    .setTitle(`Welcome to ${member.guild.name}!`)
    .setDescription(
      `Hey ${member}, welcome to **${member.guild.name}**!\n\n` +
      `You are member **#${member.guild.memberCount}**.\n\n` +
      `Enjoy your stay!`
    )
    .setColor(isNaN(decimalColor) ? 0x5865f2 : decimalColor)
    .setThumbnail(avatarUrl)
    .setImage('attachment://welcome.png')
    .setFooter({ text: `Member #${member.guild.memberCount}` })
    .setTimestamp();

  return { embed, attachment };
};

export const generateGoodbyeCard = async (
  member: GuildMember,
  embedColor?: string
): Promise<{ embed: EmbedBuilder; attachment?: AttachmentBuilder }> => {
  const color = embedColor || '#ED4245';
  const decimalColor = hexToDecimal(color);

  const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });

  const svgBuffer = Buffer.from(
    generateGoodbyeSvg(
      member.user.username,
      avatarUrl,
      member.guild.name,
      member.guild.memberCount,
      color
    ),
    'utf-8'
  );

  const attachment = new AttachmentBuilder(svgBuffer, { name: 'goodbye.png' });

  const embed = new EmbedBuilder()
    .setTitle(`Goodbye ${member.user.username}!`)
    .setDescription(
      `We'll miss you!\n\n` +
      `**${member.guild.name}** now has **${member.guild.memberCount}** members.`
    )
    .setColor(isNaN(decimalColor) ? 0xed4245 : decimalColor)
    .setThumbnail(avatarUrl)
    .setImage('attachment://goodbye.png')
    .setFooter({ text: `${member.guild.memberCount} members remaining` })
    .setTimestamp();

  return { embed, attachment };
};
