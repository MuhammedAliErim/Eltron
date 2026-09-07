import { GuildMember, EmbedBuilder, Colors, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { Cache } from '../../utils/cache';
import {
  GuildVerificationConfigRow,
  VerificationState,
  RiskLevel,
} from '../../database/schema';
import { getRiskLevel } from './RiskScoringService';
import { getRaidState } from './AntiRaidService';
import { logger } from '../../utils/logger';

interface VerificationSession {
  state: VerificationState;
  attempts: number;
  lastAttempt: number;
  startedAt: number;
  challengeCode: string;
}

interface RateLimitEntry {
  attempts: number;
  windowStart: number;
}

const sessionCache = new Cache<VerificationSession>(600000);
const rateLimitCache = new Cache<RateLimitEntry>(120000);

const getSessionKey = (guildId: string, userId: string): string =>
  `vsession:${guildId}:${userId}`;

const getRateLimitKey = (guildId: string, userId: string): string =>
  `vrate:${guildId}:${userId}`;

const generateChallengeCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const getState = (guildId: string, userId: string): VerificationSession => {
  const key = getSessionKey(guildId, userId);
  const existing = sessionCache.get(key);
  if (existing) return existing;

  const session: VerificationSession = {
    state: 'UNVERIFIED',
    attempts: 0,
    lastAttempt: 0,
    startedAt: 0,
    challengeCode: '',
  };
  sessionCache.set(key, session);
  return session;
};

const checkRateLimit = (
  guildId: string,
  userId: string,
  config: GuildVerificationConfigRow
): boolean => {
  const key = getRateLimitKey(guildId, userId);
  const now = Date.now();
  const entry = rateLimitCache.get(key);

  if (!entry || now - entry.windowStart > config.rate_limit_window_seconds * 1000) {
    rateLimitCache.set(key, { attempts: 1, windowStart: now });
    return true;
  }

  if (entry.attempts >= config.rate_limit_max_attempts) {
    return false;
  }

  entry.attempts++;
  return true;
};

const canBypass = (
  member: GuildMember,
  config: GuildVerificationConfigRow
): boolean => {
  if (member.user.bot) return true;
  if (member.id === member.guild.ownerId) return true;
  if (!config.verified_role_id) return false;
  if (member.roles.cache.has(config.verified_role_id)) return true;
  return false;
};

const getChallengeByRisk = (
  riskLevel: RiskLevel,
  raidState: string
): { type: 'button' | 'code'; question?: string; code?: string } => {
  if (raidState === 'RAID') {
    return { type: 'code', question: 'Server is under raid. Enter the verification code shown in the channel.' };
  }

  switch (riskLevel) {
    case 'LOW':
      return { type: 'button' };
    case 'MODERATE':
      return { type: 'button' };
    case 'ELEVATED':
      return { type: 'code', question: 'Higher verification required. Enter the code: **{code}**' };
    case 'HIGH':
      return { type: 'code', question: 'Strict verification. Enter the code: **{code}**' };
    case 'CRITICAL':
      return { type: 'code', question: 'Maximum security. Enter the code: **{code}**' };
  }
};

export const startVerification = async (
  member: GuildMember,
  config: GuildVerificationConfigRow
): Promise<{
  success: boolean;
  state: VerificationState;
  message: string;
  challenge?: { type: 'button' | 'code'; question?: string; challengeCode?: string };
}> => {
  if (!config.enabled) {
    return { success: false, state: 'UNVERIFIED', message: 'Verification is disabled.' };
  }

  if (canBypass(member, config)) {
    return { success: true, state: 'VERIFIED', message: 'Already verified.' };
  }

  if (!checkRateLimit(member.guild.id, member.id, config)) {
    return { success: false, state: 'FAILED', message: 'Rate limited. Try again later.' };
  }

  const session = getState(member.guild.id, member.id);

  if (session.state === 'VERIFIED') {
    return { success: true, state: 'VERIFIED', message: 'Already verified.' };
  }

  if (session.state === 'PENDING' && session.attempts >= config.max_attempts) {
    session.state = 'EXPIRED';
    sessionCache.delete(getSessionKey(member.guild.id, member.id));
    return { success: false, state: 'EXPIRED', message: 'Max attempts reached. Please try again.' };
  }

  const riskLevel = getRiskLevel(member.guild.id, member.id);
  const raidState = getRaidState(member.guild.id);
  const challenge = getChallengeByRisk(riskLevel, raidState);

  const challengeCode = challenge.type === 'code' ? generateChallengeCode() : '';

  session.state = 'PENDING';
  session.attempts++;
  session.lastAttempt = Date.now();
  if (session.startedAt === 0) session.startedAt = Date.now();
  session.challengeCode = challengeCode;

  const key = getSessionKey(member.guild.id, member.id);
  sessionCache.set(key, session);

  logger.info({
    guildId: member.guild.id,
    userId: member.id,
    riskLevel,
    raidState,
    challengeType: challenge.type,
    attempt: session.attempts,
  }, 'Verification started');

  return {
    success: true,
    state: 'PENDING',
    message: 'Verification started.',
    challenge: {
      type: challenge.type,
      question: challenge.question,
      challengeCode,
    },
  };
};

export const submitVerification = async (
  member: GuildMember,
  config: GuildVerificationConfigRow,
  input: string
): Promise<{
  success: boolean;
  state: VerificationState;
  message: string;
}> => {
  if (!config.enabled) {
    return { success: false, state: 'UNVERIFIED', message: 'Verification is disabled.' };
  }

  if (canBypass(member, config)) {
    return { success: true, state: 'VERIFIED', message: 'Already verified.' };
  }

  const session = getState(member.guild.id, member.id);

  if (session.state === 'VERIFIED') {
    return { success: true, state: 'VERIFIED', message: 'Already verified.' };
  }

  if (session.state !== 'PENDING') {
    return { success: false, state: session.state, message: 'No active verification session.' };
  }

  if (session.attempts > config.max_attempts) {
    session.state = 'EXPIRED';
    sessionCache.delete(getSessionKey(member.guild.id, member.id));
    return { success: false, state: 'EXPIRED', message: 'Max attempts reached.' };
  }

  const isCorrect = input.toUpperCase().trim() === session.challengeCode.toUpperCase().trim();

  if (isCorrect) {
    session.state = 'VERIFIED';
    sessionCache.delete(getSessionKey(member.guild.id, member.id));

    if (config.verified_role_id) {
      try {
        const role = member.guild.roles.cache.get(config.verified_role_id);
        if (role && member.guild.members.me) {
          if (role.position < member.guild.members.me.roles.highest.position) {
            await member.roles.add(config.verified_role_id);
          } else {
            logger.warn({ guildId: member.guild.id, roleId: config.verified_role_id }, 'Cannot assign verified role: hierarchy');
          }
        }
      } catch (error) {
        logger.error({ err: error, guildId: member.guild.id, userId: member.id }, 'Failed to assign verified role');
      }
    }

    if (config.unverified_role_id) {
      try {
        if (member.roles.cache.has(config.unverified_role_id) && member.guild.members.me) {
          const role = member.guild.roles.cache.get(config.unverified_role_id);
          if (role && role.position < member.guild.members.me.roles.highest.position) {
            await member.roles.remove(config.unverified_role_id);
          }
        }
      } catch (error) {
        logger.warn({ err: error }, 'Failed to remove unverified role');
      }
    }

    logger.info({ guildId: member.guild.id, userId: member.id }, 'Verification completed');
    return { success: true, state: 'VERIFIED', message: 'Verification successful!' };
  }

  session.state = 'FAILED';
  sessionCache.delete(getSessionKey(member.guild.id, member.id));

  logger.info({ guildId: member.guild.id, userId: member.id, attempts: session.attempts }, 'Verification failed');
  return { success: false, state: 'FAILED', message: 'Incorrect code. Please try again.' };
};

export const handleButtonVerification = async (
  member: GuildMember,
  config: GuildVerificationConfigRow
): Promise<{
  success: boolean;
  state: VerificationState;
  message: string;
}> => {
  if (!config.enabled) {
    return { success: false, state: 'UNVERIFIED', message: 'Verification is disabled.' };
  }

  if (canBypass(member, config)) {
    return { success: true, state: 'VERIFIED', message: 'Already verified.' };
  }

  const session = getState(member.guild.id, member.id);

  if (session.state === 'VERIFIED') {
    return { success: true, state: 'VERIFIED', message: 'Already verified.' };
  }

  if (!checkRateLimit(member.guild.id, member.id, config)) {
    return { success: false, state: 'FAILED', message: 'Rate limited.' };
  }

  const riskLevel = getRiskLevel(member.guild.id, member.id);
  const raidState = getRaidState(member.guild.id);

  if (riskLevel === 'ELEVATED' || riskLevel === 'HIGH' || riskLevel === 'CRITICAL' || raidState === 'RAID') {
    return {
      success: false,
      state: 'PENDING',
      message: 'Button verification not available for your risk level. Use `/verify` with a code.',
    };
  }

  session.state = 'VERIFIED';
  sessionCache.delete(getSessionKey(member.guild.id, member.id));

  if (config.verified_role_id) {
    try {
      const role = member.guild.roles.cache.get(config.verified_role_id);
      if (role && member.guild.members.me && role.position < member.guild.members.me.roles.highest.position) {
        await member.roles.add(config.verified_role_id);
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to assign verified role via button');
    }
  }

  if (config.unverified_role_id && member.roles.cache.has(config.unverified_role_id)) {
    try {
      const role = member.guild.roles.cache.get(config.unverified_role_id);
      if (role && member.guild.members.me && role.position < member.guild.members.me.roles.highest.position) {
        await member.roles.remove(config.unverified_role_id);
      }
    } catch (error) {
      logger.warn({ err: error }, 'Failed to remove unverified role via button');
    }
  }

  logger.info({ guildId: member.guild.id, userId: member.id }, 'Button verification completed');
  return { success: true, state: 'VERIFIED', message: 'Verified via button!' };
};

export const getVerificationState = (guildId: string, userId: string): VerificationState => {
  const session = sessionCache.get(getSessionKey(guildId, userId));
  return session?.state ?? 'UNVERIFIED';
};

export const resetVerification = (guildId: string, userId: string): void => {
  sessionCache.delete(getSessionKey(guildId, userId));
  rateLimitCache.delete(getRateLimitKey(guildId, userId));
};

export const createVerificationEmbed = (
  member: GuildMember,
  config: GuildVerificationConfigRow,
  challenge: { type: 'button' | 'code'; question?: string; challengeCode?: string }
): { embed: EmbedBuilder; row?: ActionRowBuilder<ButtonBuilder> } => {
  const embed = new EmbedBuilder()
    .setTitle('Server Verification')
    .setDescription(`Welcome ${member}, please verify yourself to access the server.`)
    .setColor(Colors.Blue)
    .setTimestamp();

  if (challenge.type === 'code' && challenge.question) {
    const questionText = challenge.question.replace('{code}', challenge.challengeCode || '');
    embed.addFields({ name: 'Verification Required', value: questionText });
  } else {
    embed.addFields({
      name: 'Verification',
      value: 'Click the button below to verify.',
    });
  }

  if (challenge.type === 'button') {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify:${member.guild.id}:${member.id}`)
        .setLabel('Verify')
        .setStyle(ButtonStyle.Success)
    );
    return { embed, row };
  }

  return { embed };
};

export const cleanupVerificationStates = (): void => {
  const now = Date.now();
  for (const [key, session] of sessionCache.entries()) {
    if (session.state === 'PENDING' && now - session.startedAt > 600000) {
      session.state = 'EXPIRED';
      sessionCache.delete(key);
    }
    if (session.state === 'FAILED' && now - session.lastAttempt > 300000) {
      sessionCache.delete(key);
    }
  }
};
