import { GuildMember } from 'discord.js';
import { Cache } from '../../utils/cache';
import {
  GuildAntiRaidConfigRow,
  RaidState,
  AntiRaidAction,
} from '../../database/schema';
import { isAntiRaidBypassed } from './AntiRaidConfig';
import { logger } from '../../utils/logger';

interface JoinRecord {
  userId: string;
  timestamp: number;
  accountAge: number;
}

interface GuildRaidState {
  state: RaidState;
  joins: JoinRecord[];
  youngAccountJoins: JoinRecord[];
  stateChangedAt: number;
  lastActionAt: number;
}

const guildRaidStates = new Cache<GuildRaidState>(600000);

const getStateKey = (guildId: string): string => `raid:${guildId}`;

const getStateWithConfig = (guildId: string, config: GuildAntiRaidConfigRow): GuildRaidState => {
  const key = getStateKey(guildId);
  const existing = guildRaidStates.get(key);
  if (existing) return existing;

  const state: GuildRaidState = {
    state: 'NORMAL',
    joins: [],
    youngAccountJoins: [],
    stateChangedAt: Date.now(),
    lastActionAt: 0,
  };
  guildRaidStates.set(key, state, config.lockdown_duration_seconds * 1000);
  return state;
};

const cleanupGuildJoins = (
  state: GuildRaidState,
  config: GuildAntiRaidConfigRow
): void => {
  const now = Date.now();
  const maxWindow = Math.max(
    config.join_rate_window_seconds,
    config.burst_window_seconds
  ) * 1000;

  state.joins = state.joins.filter((j) => now - j.timestamp <= maxWindow);
  state.youngAccountJoins = state.youngAccountJoins.filter(
    (j) => now - j.timestamp <= maxWindow
  );
};

const isBypassed = (
  config: GuildAntiRaidConfigRow,
  member: GuildMember
): boolean => {
  if (member.user.bot) return true;
  if (member.guild.members.me && member.roles.highest.position >= member.guild.members.me.roles.highest.position) return true;
  if (member.id === member.guild.ownerId) return true;
  return isAntiRaidBypassed(config, member.id, member.roles.cache.map((r) => r.id));
};

const getAccountAgeDays = (member: GuildMember): number => {
  const now = Date.now();
  const created = member.user.createdTimestamp;
  return (now - created) / (1000 * 60 * 60 * 24);
};

const detectJoinRate = (
  state: GuildRaidState,
  config: GuildAntiRaidConfigRow
): boolean => {
  const now = Date.now();
  const windowMs = config.join_rate_window_seconds * 1000;
  const recentJoins = state.joins.filter((j) => now - j.timestamp <= windowMs);
  return recentJoins.length >= config.join_rate_limit;
};

const detectBurst = (
  state: GuildRaidState,
  config: GuildAntiRaidConfigRow
): boolean => {
  const now = Date.now();
  const windowMs = config.burst_window_seconds * 1000;
  const recentJoins = state.joins.filter((j) => now - j.timestamp <= windowMs);
  return recentJoins.length >= config.burst_threshold;
};

const detectYoungAccountBurst = (
  state: GuildRaidState,
  config: GuildAntiRaidConfigRow
): boolean => {
  const now = Date.now();
  const windowMs = config.burst_window_seconds * 1000;
  const recentJoins = state.joins.filter((j) => now - j.timestamp <= windowMs);
  if (recentJoins.length < 3) return false;

  const youngCount = recentJoins.filter(
    (j) => j.accountAge <= config.account_age_threshold_days
  ).length;

  return youngCount >= Math.ceil(recentJoins.length * 0.5);
};

export interface RaidDetectionResult {
  detected: boolean;
  reason: string;
  joinCount: number;
  windowSeconds: number;
  youngAccountCount: number;
}

export const processMemberJoin = async (
  member: GuildMember,
  config: GuildAntiRaidConfigRow
): Promise<RaidDetectionResult> => {
  const result: RaidDetectionResult = {
    detected: false,
    reason: '',
    joinCount: 0,
    windowSeconds: 0,
    youngAccountCount: 0,
  };

  if (!config.enabled) return result;
  if (isBypassed(config, member)) return result;

  const state = getStateWithConfig(member.guild.id, config);
  cleanupGuildJoins(state, config);

  const accountAge = getAccountAgeDays(member);
  const now = Date.now();

  const record: JoinRecord = {
    userId: member.id,
    timestamp: now,
    accountAge,
  };

  state.joins.push(record);

  if (accountAge <= config.account_age_threshold_days) {
    state.youngAccountJoins.push(record);
  }

  const rateTriggered = detectJoinRate(state, config);
  const burstTriggered = detectBurst(state, config);
  const youngBurstTriggered = detectYoungAccountBurst(state, config);

  const windowSeconds = Math.max(
    config.join_rate_window_seconds,
    config.burst_window_seconds
  );
  const now2 = Date.now();
  const recentJoins = state.joins.filter((j) => now2 - j.timestamp <= windowSeconds * 1000);
  const recentYoung = state.youngAccountJoins.filter((j) => now2 - j.timestamp <= windowSeconds * 1000);

  result.joinCount = recentJoins.length;
  result.windowSeconds = windowSeconds;
  result.youngAccountCount = recentYoung.length;

  if (youngBurstTriggered) {
    result.detected = true;
    result.reason = `Young account burst: ${recentYoung.length} new accounts (<=${config.account_age_threshold_days} days) in ${windowSeconds}s among ${recentJoins.length} joins`;
  } else if (burstTriggered) {
    result.detected = true;
    result.reason = `Join burst: ${recentJoins.length} joins in ${config.burst_window_seconds}s`;
  } else if (rateTriggered) {
    result.detected = true;
    result.reason = `Join rate exceeded: ${recentJoins.length} joins in ${config.join_rate_window_seconds}s (limit: ${config.join_rate_limit})`;
  }

  if (result.detected) {
    const prevState = state.state;
    if (prevState === 'NORMAL') {
      state.state = 'SUSPECTED';
      state.stateChangedAt = now;
      logger.warn({
        guildId: member.guild.id,
        joinCount: result.joinCount,
        reason: result.reason,
        prevState,
        newState: 'SUSPECTED',
      }, 'Anti-raid: state transition NORMAL → SUSPECTED');
    } else if (prevState === 'SUSPECTED') {
      state.state = 'RAID';
      state.stateChangedAt = now;
      logger.warn({
        guildId: member.guild.id,
        joinCount: result.joinCount,
        reason: result.reason,
        prevState,
        newState: 'RAID',
      }, 'Anti-raid: state transition SUSPECTED → RAID');
    }
  }

  return result;
};

export const getRaidState = (guildId: string): RaidState => {
  const state = guildRaidStates.get(getStateKey(guildId));
  return state?.state ?? 'NORMAL';
};

export const resetRaidState = (guildId: string): void => {
  guildRaidStates.delete(getStateKey(guildId));
};

export const shouldTakeAction = (guildId: string): boolean => {
  const state = guildRaidStates.get(getStateKey(guildId));
  if (!state) return false;
  if (state.state !== 'RAID') return false;

  const now = Date.now();
  if (now - state.lastActionAt < 5000) return false;

  state.lastActionAt = now;
  return true;
};

export const getRaidAction = (config: GuildAntiRaidConfigRow): AntiRaidAction => {
  return config.raid_action;
};

export const cleanupRaidStates = (): void => {
  const now = Date.now();
  for (const [key, state] of guildRaidStates.entries()) {
    if (state.state === 'NORMAL' && now - state.stateChangedAt > 600000) {
      guildRaidStates.delete(key);
    }
    if (state.state === 'SUSPECTED' && now - state.stateChangedAt > 300000) {
      state.state = 'NORMAL';
      state.stateChangedAt = now;
    }
  }
};

export const getRecentJoins = (guildId: string, windowMs: number): JoinRecord[] => {
  const state = guildRaidStates.get(getStateKey(guildId));
  if (!state) return [];
  const now = Date.now();
  return state.joins.filter((j) => now - j.timestamp <= windowMs);
};

export const getJoinStats = (guildId: string): {
  total: number;
  young: number;
  state: RaidState;
} => {
  const state = guildRaidStates.get(getStateKey(guildId));
  if (!state) return { total: 0, young: 0, state: 'NORMAL' };
  return {
    total: state.joins.length,
    young: state.youngAccountJoins.length,
    state: state.state,
  };
};
