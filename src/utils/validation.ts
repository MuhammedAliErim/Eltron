import { z } from 'zod';
import { SUPPORTED_LANGUAGES, SUPPORTED_TIMEZONES } from '../config/bot';

export const snowflakeSchema = z.string().regex(/^\d{17,20}$/, 'Invalid Discord snowflake ID');

export const guildIdSchema = snowflakeSchema;
export const userIdSchema = snowflakeSchema;

export const languageSchema = z.enum(SUPPORTED_LANGUAGES);

export const timezoneSchema = z.enum(SUPPORTED_TIMEZONES);

export const guildSettingsSchema = z.object({
  language: languageSchema,
  timezone: timezoneSchema,
  log_channels: z.record(z.string(), snowflakeSchema).optional(),
});

export type GuildSettingsInput = z.infer<typeof guildSettingsSchema>;
