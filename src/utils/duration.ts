export interface DurationParseResult {
  valid: boolean;
  milliseconds?: number;
  display?: string;
  error?: string;
}

/**
 * Supports: s (seconds), m (minutes), h (hours), d (days), w (weeks)
 * Examples: 30s, 5m, 2h, 7d, 2w
 */
const DURATION_REGEX = /^(\d+)(s|m|h|d|w)$/;

const MULTIPLIERS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

const UNIT_LABELS: Record<string, { singular: string; plural: string }> = {
  s: { singular: 'second', plural: 'seconds' },
  m: { singular: 'minute', plural: 'minutes' },
  h: { singular: 'hour', plural: 'hours' },
  d: { singular: 'day', plural: 'days' },
  w: { singular: 'week', plural: 'weeks' },
};

/** Discord max timeout: 28 days */
const MAX_TIMEOUT_DURATION = 28 * 24 * 60 * 60 * 1000;
/** Max giveaway/event duration: 30 days */
export const MAX_EVENT_DURATION = 30 * 24 * 60 * 60 * 1000;

export const parseDuration = (input: string): DurationParseResult => {
  const match = input.toLowerCase().trim().match(DURATION_REGEX);

  if (!match) {
    return {
      valid: false,
      error: 'Invalid duration format. Use: 30s, 10m, 1h, 7d, 2w',
    };
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const milliseconds = value * MULTIPLIERS[unit];

  if (milliseconds > MAX_TIMEOUT_DURATION) {
    return {
      valid: false,
      error: 'Maximum timeout duration is 28 days.',
    };
  }

  if (milliseconds <= 0) {
    return {
      valid: false,
      error: 'Duration must be greater than 0.',
    };
  }

  const labels = UNIT_LABELS[unit];
  const display = `${value} ${value === 1 ? labels.singular : labels.plural}`;

  return { valid: true, milliseconds, display };
};

/**
 * Parses duration for giveaways/events — allows up to 30 days (overrides timeout limit).
 */
export const parseEventDuration = (input: string): DurationParseResult => {
  const match = input.toLowerCase().trim().match(DURATION_REGEX);

  if (!match) {
    return {
      valid: false,
      error: 'Invalid duration format. Use: 30s, 10m, 1h, 7d, 2w',
    };
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const milliseconds = value * MULTIPLIERS[unit];

  if (milliseconds > MAX_EVENT_DURATION) {
    return {
      valid: false,
      error: 'Maximum event/giveaway duration is 30 days.',
    };
  }

  if (milliseconds <= 0) {
    return {
      valid: false,
      error: 'Duration must be greater than 0.',
    };
  }

  const labels = UNIT_LABELS[unit];
  const display = `${value} ${value === 1 ? labels.singular : labels.plural}`;

  return { valid: true, milliseconds, display };
};

/**
 * Formats milliseconds into a human-readable short string (e.g. "2d 3h 5m").
 */
export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const weeks = Math.floor(totalSeconds / 604800);
  const days = Math.floor((totalSeconds % 604800) / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
};

/**
 * Formats milliseconds into a verbose human-readable string (e.g. "2 days, 3 hours").
 */
export const formatDurationLong = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const weeks = Math.floor(totalSeconds / 604800);
  const days = Math.floor((totalSeconds % 604800) / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? 'week' : 'weeks'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  if (seconds > 0) parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);

  return parts.slice(0, 2).join(', ') || '0 seconds';
};

export const isTimeoutDuration = (ms: number): boolean => {
  return ms > 0 && ms <= MAX_TIMEOUT_DURATION;
};

