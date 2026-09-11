import { Cache } from '../../utils/cache';

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CAPTCHA_LENGTH = 6;
const CAPTCHA_EXPIRY_MS = 300000;

interface CaptchaSession {
  code: string;
  createdAt: number;
  attempts: number;
}

interface MathCaptchaSession {
  answer: number;
  createdAt: number;
  attempts: number;
}

const codeCaptchaCache = new Cache<CaptchaSession>(CAPTCHA_EXPIRY_MS);
const mathCaptchaCache = new Cache<MathCaptchaSession>(CAPTCHA_EXPIRY_MS);

const getSessionKey = (guildId: string, userId: string): string =>
  `captcha:${guildId}:${userId}`;

const getMathSessionKey = (guildId: string, userId: string): string =>
  `mathcaptcha:${guildId}:${userId}`;

export const generateCaptcha = (
  guildId: string,
  userId: string
): { code: string; display: string } => {
  let code = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    code += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
  }

  const spacedCode = code.split('').join(' ');
  const display = `**Verify:** \`${spacedCode}\`\nEnter the code above (case-insensitive).`;

  const key = getSessionKey(guildId, userId);
  codeCaptchaCache.set(key, { code, createdAt: Date.now(), attempts: 0 });

  return { code, display };
};

export const generateMathCaptcha = (
  guildId: string,
  userId: string
): { question: string; answer: number } => {
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 20) + 1;
  const operators = ['+', '-', '*'] as const;
  const operator = operators[Math.floor(Math.random() * operators.length)];

  let answer: number;
  let operatorSymbol: string;

  switch (operator) {
    case '+':
      answer = num1 + num2;
      operatorSymbol = '+';
      break;
    case '-':
      answer = num1 - num2;
      operatorSymbol = '-';
      break;
    case '*':
      answer = num1 * num2;
      operatorSymbol = 'x';
      break;
  }

  const question = `**Solve:** What is \`${num1} ${operatorSymbol} ${num2}\`?`;

  const key = getMathSessionKey(guildId, userId);
  mathCaptchaCache.set(key, { answer, createdAt: Date.now(), attempts: 0 });

  return { question, answer };
};

export const verifyCaptcha = (
  guildId: string,
  userId: string,
  input: string
): { success: boolean; attemptsRemaining: number } => {
  const key = getSessionKey(guildId, userId);
  const session = codeCaptchaCache.get(key);

  if (!session) {
    return { success: false, attemptsRemaining: 0 };
  }

  const isCorrect = input.toUpperCase().trim() === session.code.toUpperCase().trim();

  if (isCorrect) {
    codeCaptchaCache.delete(key);
    return { success: true, attemptsRemaining: 0 };
  }

  session.attempts++;
  codeCaptchaCache.set(key, session);

  return { success: false, attemptsRemaining: Math.max(0, 3 - session.attempts) };
};

export const verifyMathCaptcha = (
  guildId: string,
  userId: string,
  input: string
): { success: boolean; attemptsRemaining: number } => {
  const key = getMathSessionKey(guildId, userId);
  const session = mathCaptchaCache.get(key);

  if (!session) {
    return { success: false, attemptsRemaining: 0 };
  }

  const numericInput = parseInt(input.trim(), 10);
  const isCorrect = !isNaN(numericInput) && numericInput === session.answer;

  if (isCorrect) {
    mathCaptchaCache.delete(key);
    return { success: true, attemptsRemaining: 0 };
  }

  session.attempts++;
  mathCaptchaCache.set(key, session);

  return { success: false, attemptsRemaining: Math.max(0, 3 - session.attempts) };
};

export const hasCaptchaSession = (guildId: string, userId: string): boolean => {
  const codeKey = getSessionKey(guildId, userId);
  const mathKey = getMathSessionKey(guildId, userId);
  return codeCaptchaCache.has(codeKey) || mathCaptchaCache.has(mathKey);
};

export const cleanupCaptchaSessions = (): void => {
  const now = Date.now();
  for (const [key, session] of codeCaptchaCache.entries()) {
    if (now - session.createdAt > CAPTCHA_EXPIRY_MS) {
      codeCaptchaCache.delete(key);
    }
  }
  for (const [key, session] of mathCaptchaCache.entries()) {
    if (now - session.createdAt > CAPTCHA_EXPIRY_MS) {
      mathCaptchaCache.delete(key);
    }
  }
};
