import { env } from './env';

export const BOT_OWNERS: string[] = env.BOT_OWNERS
  ? env.BOT_OWNERS.split(',').map((id) => id.trim()).filter(Boolean)
  : [];

export const DEFAULT_LANGUAGE = 'tr';
export const DEFAULT_TIMEZONE = 'Europe/Istanbul';

export const SUPPORTED_LANGUAGES = ['tr', 'en', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const SUPPORTED_TIMEZONES = [
  'Europe/Istanbul',
  'Europe/Berlin',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
] as const;
export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number];
