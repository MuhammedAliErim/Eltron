import { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export default class ColorCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('color')
    .setDescription('Get information about a color')
    .addStringOption((option) =>
      option.setName('hex').setDescription('Hex color code (e.g. #FF5733 or FF5733)').setRequired(true),
    );

  category = 'Utility';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const hexInput = interaction.options.getString('hex', true).trim();
    const hexClean = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;

    if (!/^#[0-9a-fA-F]{6}$/.test(hexClean)) {
      await interaction.reply({
        content: '❌ Invalid hex color code. Please provide a valid 6-digit hex code (e.g. #FF5733).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const rgb = hexToRgb(hexClean);
    if (!rgb) {
      await interaction.reply({
        content: '❌ Invalid hex color code.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const decimal = (rgb.r << 16) | (rgb.g << 8) | rgb.b;

    const embed = new EmbedBuilder()
      .setTitle(`Color — ${hexClean.toUpperCase()}`)
      .setColor(hexClean as `#${string}`)
      .addFields(
        { name: 'HEX', value: `\`${hexClean.toUpperCase()}\``, inline: true },
        { name: 'RGB', value: `\`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\``, inline: true },
        { name: 'HSL', value: `\`hsl(${hsl.h}°, ${hsl.s}%, ${hsl.l}%)\``, inline: true },
        { name: 'Decimal', value: `\`${decimal}\``, inline: true },
      )
      .setThumbnail(`https://singlecolorimage.com/get/${hexClean.replace('#', '')}/128x128`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
