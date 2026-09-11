import { Guild, GuildEmoji } from 'discord.js';

export interface EmojiDetail {
  name: string;
  id: string;
  animated: boolean;
  managed: boolean;
  requiresColons: boolean;
  available: boolean;
}

export interface EmojiCategory {
  letter: string;
  emojis: EmojiDetail[];
}

export interface EmojiStats {
  total: number;
  animated: number;
  static: number;
  managed: number;
  custom: number;
  categories: EmojiCategory[];
  emojis: EmojiDetail[];
}

export function getEmojiStats(guild: Guild): EmojiStats {
  const emojis = guild.emojis.cache;

  const details: EmojiDetail[] = emojis.map((emoji: GuildEmoji) => ({
    name: emoji.name || 'unknown',
    id: emoji.id,
    animated: emoji.animated,
    managed: emoji.managed,
    requiresColons: emoji.requiresColons ?? true,
    available: emoji.available ?? true,
  }));

  details.sort((a, b) => a.name.localeCompare(b.name));

  const animated = details.filter((e) => e.animated).length;
  const managed = details.filter((e) => e.managed).length;

  const letterMap = new Map<string, EmojiDetail[]>();
  for (const emoji of details) {
    const first = emoji.name.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : '#';
    if (!letterMap.has(letter)) letterMap.set(letter, []);
    letterMap.get(letter)!.push(emoji);
  }

  const categories: EmojiCategory[] = Array.from(letterMap.entries())
    .sort(([a], [b]) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    })
    .map(([letter, emojis]) => ({ letter, emojis }));

  return {
    total: details.length,
    animated,
    static: details.length - animated,
    managed,
    custom: details.length - managed,
    categories,
    emojis: details,
  };
}

export function getEmojiById(guild: Guild, emojiId: string): EmojiDetail | null {
  const emoji = guild.emojis.cache.get(emojiId);
  if (!emoji) return null;

  return {
    name: emoji.name || 'unknown',
    id: emoji.id,
    animated: emoji.animated,
    managed: emoji.managed,
    requiresColons: emoji.requiresColons ?? true,
    available: emoji.available ?? true,
  };
}
