import { Message } from 'discord.js';
import { CountingRepository } from '../../database/repositories/CountingRepository';

const repo = new CountingRepository();

export interface CountingResult {
  valid: boolean;
  correct?: boolean;
  currentNumber?: number;
  expectedNumber?: number;
  milestone?: number;
  score?: {
    correctCount: number;
    streak: number;
    bestStreak: number;
  };
}

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

export async function handleMessage(message: Message): Promise<CountingResult> {
  if (!message.guild) return { valid: false };

  const config = await repo.getConfigByChannel(message.channel.id);
  if (!config) return { valid: false };

  const content = message.content.trim();
  const number = parseInt(content, 10);

  if (isNaN(number)) return { valid: false };

  const expectedNumber = config.current_number + 1;

  if (message.author.id === config.last_user_id) {
    await repo.updateConfig(config.guild_id, {
      current_number: 0,
      last_user_id: null,
    });

    await repo.updateScore(config.guild_id, message.author.id, {
      streak: 0,
    });

    return {
      valid: true,
      correct: false,
      currentNumber: 0,
      expectedNumber,
    };
  }

  if (number === expectedNumber) {
    const newHighest = Math.max(config.highest_number, number);
    let milestone: number | undefined;

    for (const m of MILESTONES) {
      if (config.current_number < m && number >= m) {
        milestone = m;
        break;
      }
    }

    await repo.updateConfig(config.guild_id, {
      current_number: number,
      highest_number: newHighest,
      last_user_id: message.author.id,
    });

    const score = await repo.getScore(config.guild_id, message.author.id);
    const newStreak = (score?.streak || 0) + 1;
    const newBestStreak = Math.max(score?.best_streak || 0, newStreak);
    const newCorrectCount = (score?.correct_count || 0) + 1;

    const updatedScore = await repo.updateScore(config.guild_id, message.author.id, {
      correct_count: newCorrectCount,
      streak: newStreak,
      best_streak: newBestStreak,
      last_number: number,
    });

    return {
      valid: true,
      correct: true,
      currentNumber: number,
      expectedNumber,
      milestone,
      score: {
        correctCount: updatedScore.correct_count,
        streak: updatedScore.streak,
        bestStreak: updatedScore.best_streak,
      },
    };
  }

  if (config.reset_on_fail) {
    await repo.updateConfig(config.guild_id, {
      current_number: 0,
      last_user_id: null,
    });
  }

  await repo.updateScore(config.guild_id, message.author.id, {
    streak: 0,
  });

  return {
    valid: true,
    correct: false,
    currentNumber: config.reset_on_fail ? 0 : config.current_number,
    expectedNumber,
  };
}
