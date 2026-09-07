export interface DurationParseResult {
  valid: boolean;
  milliseconds?: number;
  display?: string;
  error?: string;
}

const DURATION_REGEX = /^(\d+)(s|m|h|d)$/;

const MULTIPLIERS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

const MAX_TIMEOUT_DURATION = 28 * 24 * 60 * 60 * 1000;

export const parseDuration = (input: string): DurationParseResult => {
  const match = input.toLowerCase().trim().match(DURATION_REGEX);

  if (!match) {
    return {
      valid: false,
      error: 'Invalid duration format. Use: 30s, 10m, 1h, 7d',
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

  const display = `${value}${unit}`;

  return { valid: true, milliseconds, display };
};

export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
};

export const isTimeoutDuration = (ms: number): boolean => {
  return ms > 0 && ms <= MAX_TIMEOUT_DURATION;
};
