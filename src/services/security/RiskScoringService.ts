import { Cache } from '../../utils/cache';
import { RiskSignal, RiskLevel } from '../../database/schema';

const SIGNAL_WEIGHTS: Record<RiskSignal, number> = {
  very_new_account: 10,
  suspicious_join: 15,
  join_burst: 25,
  raid_detected: 40,
  flood_detected: 20,
  duplicate_message: 10,
  mention_spam: 15,
  caps_spam: 5,
  banned_word: 10,
  discord_invite: 10,
  suspicious_url: 10,
  repeated_violations: 15,
  moderation_history: 20,
};

const DECAY_HALF_LIFE_MS = 10 * 60 * 1000;
const DECAY_FACTOR = 0.5;
const MAX_SCORE = 100;
const MIN_SCORE = 0;

interface SignalRecord {
  signal: RiskSignal;
  timestamp: number;
  weight: number;
}

interface RiskState {
  rawScore: number;
  signals: SignalRecord[];
  lastUpdated: number;
  lastSignal: RiskSignal | null;
  raidActive: boolean;
}

const riskStateCache = new Cache<RiskState>(3600000);

const getStateKey = (guildId: string, userId: string): string =>
  `risk:${guildId}:${userId}`;

const getState = (guildId: string, userId: string): RiskState => {
  const key = getStateKey(guildId, userId);
  const existing = riskStateCache.get(key);
  if (existing) return existing;

  const state: RiskState = {
    rawScore: 0,
    signals: [],
    lastUpdated: Date.now(),
    lastSignal: null,
    raidActive: false,
  };
  riskStateCache.set(key, state);
  return state;
};

const getLevel = (score: number): RiskLevel => {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'ELEVATED';
  if (score >= 20) return 'MODERATE';
  return 'LOW';
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const applyDecay = (state: RiskState, now: number): void => {
  if (state.raidActive) return;

  const elapsed = now - state.lastUpdated;
  if (elapsed <= 0) return;

  const decayPeriods = elapsed / DECAY_HALF_LIFE_MS;
  const decayMultiplier = Math.pow(DECAY_FACTOR, decayPeriods);

  state.rawScore = state.rawScore * decayMultiplier;

  const cutoff = now - DECAY_HALF_LIFE_MS * 3;
  state.signals = state.signals.filter((s) => s.timestamp > cutoff);

  state.lastUpdated = now;
};

const recalculateScore = (state: RiskState): number => {
  let score = 0;
  for (const record of state.signals) {
    score += record.weight;
  }
  state.rawScore = score;
  return clamp(Math.round(state.rawScore), MIN_SCORE, MAX_SCORE);
};

export const addSignal = (
  guildId: string,
  userId: string,
  signal: RiskSignal,
  overrideWeight?: number
): number => {
  const state = getState(guildId, userId);
  const now = Date.now();

  applyDecay(state, now);

  const weight = overrideWeight ?? SIGNAL_WEIGHTS[signal];
  state.signals.push({ signal, timestamp: now, weight });
  state.lastSignal = signal;
  state.lastUpdated = now;

  recalculateScore(state);
  return clamp(Math.round(state.rawScore), MIN_SCORE, MAX_SCORE);
};

export const addSignals = (
  guildId: string,
  userId: string,
  signals: RiskSignal[]
): number => {
  const state = getState(guildId, userId);
  const now = Date.now();

  applyDecay(state, now);

  for (const signal of signals) {
    const weight = SIGNAL_WEIGHTS[signal];
    state.signals.push({ signal, timestamp: now, weight });
  }

  if (signals.length > 0) {
    state.lastSignal = signals[signals.length - 1];
  }
  state.lastUpdated = now;

  recalculateScore(state);
  return clamp(Math.round(state.rawScore), MIN_SCORE, MAX_SCORE);
};

export const getScore = (guildId: string, userId: string): number => {
  const key = getStateKey(guildId, userId);
  const state = riskStateCache.get(key);
  if (!state) return 0;

  const now = Date.now();
  applyDecay(state, now);
  return clamp(Math.round(state.rawScore), MIN_SCORE, MAX_SCORE);
};

export const getRiskLevel = (guildId: string, userId: string): RiskLevel => {
  return getLevel(getScore(guildId, userId));
};

export const getRiskDetail = (guildId: string, userId: string): {
  score: number;
  level: RiskLevel;
  lastSignal: RiskSignal | null;
  signalCount: number;
  raidActive: boolean;
} => {
  const key = getStateKey(guildId, userId);
  const state = riskStateCache.get(key);
  if (!state) {
    return { score: 0, level: 'LOW', lastSignal: null, signalCount: 0, raidActive: false };
  }

  const now = Date.now();
  applyDecay(state, now);
  const score = clamp(Math.round(state.rawScore), MIN_SCORE, MAX_SCORE);

  return {
    score,
    level: getLevel(score),
    lastSignal: state.lastSignal,
    signalCount: state.signals.length,
    raidActive: state.raidActive,
  };
};

export const setRaidActive = (guildId: string, userId: string, active: boolean): void => {
  const state = getState(guildId, userId);
  state.raidActive = active;
};

export const resetScore = (guildId: string, userId: string): void => {
  riskStateCache.delete(getStateKey(guildId, userId));
};

export const getSignalWeight = (signal: RiskSignal): number =>
  SIGNAL_WEIGHTS[signal];

export const getAllSignalWeights = (): Readonly<Record<RiskSignal, number>> =>
  SIGNAL_WEIGHTS;

export const getScoreForLevel = (level: RiskLevel): { min: number; max: number } => {
  switch (level) {
    case 'LOW': return { min: 0, max: 19 };
    case 'MODERATE': return { min: 20, max: 39 };
    case 'ELEVATED': return { min: 40, max: 59 };
    case 'HIGH': return { min: 60, max: 79 };
    case 'CRITICAL': return { min: 80, max: 100 };
  }
};

export const getActionForLevel = (level: RiskLevel): {
  log: boolean;
  monitor: boolean;
  action: boolean;
  actionType: string | null;
} => {
  switch (level) {
    case 'LOW':
      return { log: false, monitor: false, action: false, actionType: null };
    case 'MODERATE':
      return { log: true, monitor: false, action: false, actionType: null };
    case 'ELEVATED':
      return { log: true, monitor: true, action: false, actionType: null };
    case 'HIGH':
      return { log: true, monitor: true, action: true, actionType: 'WARN' };
    case 'CRITICAL':
      return { log: true, monitor: true, action: true, actionType: 'TIMEOUT' };
  }
};

export const getDecayConfig = (): { halfLifeMs: number; factor: number } => ({
  halfLifeMs: DECAY_HALF_LIFE_MS,
  factor: DECAY_FACTOR,
});

export const cleanupRiskStates = (): void => {
  const now = Date.now();
  for (const [key, state] of riskStateCache.entries()) {
    if (
      state.rawScore <= 1 &&
      !state.raidActive &&
      now - state.lastUpdated > DECAY_HALF_LIFE_MS * 5
    ) {
      riskStateCache.delete(key);
    }
  }
};
