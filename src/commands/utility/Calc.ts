import { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

const MATH_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

const UNARY_FUNCTIONS: Record<string, (v: number) => number> = {
  sqrt: (v) => Math.sqrt(v),
  sin: (v) => Math.sin(v),
  cos: (v) => Math.cos(v),
  tan: (v) => Math.tan(v),
  abs: (v) => Math.abs(v),
  floor: (v) => Math.floor(v),
  ceil: (v) => Math.ceil(v),
  round: (v) => Math.round(v),
  log: (v) => Math.log(v),
  log2: (v) => Math.log2(v),
  log10: (v) => Math.log10(v),
};

type Token =
  | { type: 'number'; value: number }
  | { type: 'operator'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'function'; name: string }
  | { type: 'constant'; value: number }
  | { type: 'unary_minus' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.toLowerCase().replace(/\s+/g, '');

  while (i < s.length) {
    const ch = s[i];

    if (ch >= '0' && ch <= '9' || ch === '.') {
      let num = '';
      while (i < s.length && (s[i] >= '0' && s[i] <= '9' || s[i] === '.')) {
        num += s[i++];
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }

    if (ch >= 'a' && ch <= 'z') {
      let name = '';
      while (i < s.length && s[i] >= 'a' && s[i] <= 'z') {
        name += s[i++];
      }

      if (name in MATH_CONSTANTS) {
        tokens.push({ type: 'constant', value: MATH_CONSTANTS[name] });
      } else if (name in UNARY_FUNCTIONS) {
        tokens.push({ type: 'function', name });
      } else {
        throw new Error(`Unknown identifier: ${name}`);
      }
      continue;
    }

    if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ type: 'operator', value: ch });
      i++;
      continue;
    }

    throw new Error(`Unexpected character: ${ch}`);
  }

  return tokens;
}

function precedence(op: string): number {
  if (op === '+' || op === '-') return 1;
  if (op === '*' || op === '/') return 2;
  if (op === '^') return 3;
  return 0;
}

function isRightAssociative(op: string): boolean {
  return op === '^';
}

function applyOp(op: string, a: number, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    }
    case '^': return Math.pow(a, b);
    default: throw new Error(`Unknown operator: ${op}`);
  }
}

function evaluate(tokens: Token[]): number {
  const values: number[] = [];
  const ops: string[] = [];
  let expectValue = true;

  function applyTop() {
    const op = ops.pop()!;
    const b = values.pop()!;
    const a = values.pop()!;
    values.push(applyOp(op, a, b));
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'number') {
      values.push(token.value);
      expectValue = false;
    } else if (token.type === 'constant') {
      values.push(token.value);
      expectValue = false;
    } else if (token.type === 'function') {
      ops.push(token.name);
      expectValue = true;
    } else if (token.type === 'unary_minus') {
      values.push(0);
      ops.push('-');
      expectValue = true;
    } else if (token.type === 'lparen') {
      ops.push('(');
      expectValue = true;
    } else if (token.type === 'rparen') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(') {
        if (ops[ops.length - 1] in UNARY_FUNCTIONS) {
          const fn = ops.pop()!;
          const v = values.pop()!;
          values.push(UNARY_FUNCTIONS[fn](v));
        } else {
          applyTop();
        }
      }

      if (ops.length === 0) throw new Error('Mismatched parentheses');
      ops.pop();

      if (ops.length > 0 && ops[ops.length - 1] in UNARY_FUNCTIONS) {
        const fn = ops.pop()!;
        const v = values.pop()!;
        values.push(UNARY_FUNCTIONS[fn](v));
      }
      expectValue = false;
    } else if (token.type === 'operator') {
      if (token.value === '-' && expectValue) {
        tokens.splice(i + 1, 0, { type: 'number', value: 0 });
        ops.push('-');
      } else {
        while (
          ops.length > 0 &&
          ops[ops.length - 1] !== '(' &&
          (ops[ops.length - 1] in UNARY_FUNCTIONS ||
            precedence(ops[ops.length - 1]) > precedence(token.value) ||
            (precedence(ops[ops.length - 1]) === precedence(token.value) && !isRightAssociative(token.value)))
        ) {
          if (ops[ops.length - 1] in UNARY_FUNCTIONS) {
            const fn = ops.pop()!;
            const v = values.pop()!;
            values.push(UNARY_FUNCTIONS[fn](v));
          } else {
            applyTop();
          }
        }
        ops.push(token.value);
      }
      expectValue = true;
    }
  }

  while (ops.length > 0) {
    const op = ops.pop()!;
    if (op === '(') throw new Error('Mismatched parentheses');
    if (op in UNARY_FUNCTIONS) {
      const v = values.pop()!;
      values.push(UNARY_FUNCTIONS[op](v));
    } else {
      applyTop();
    }
  }

  if (values.length !== 1) throw new Error('Invalid expression');
  return values[0];
}

function sanitizeInput(input: string): string {
  let result = '';
  let prevWasValue = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const chLower = ch.toLowerCase();

    if (chLower >= 'a' && chLower <= 'z' || ch >= '0' && ch <= '9' || ch === '.') {
      if (prevWasValue && (ch >= '0' && ch <= '9' || ch === '.')) {
        result += ch;
      } else {
        result += ch;
        prevWasValue = true;
      }
    } else if (ch === '(' || ch === ')' || ch === '^') {
      result += ch;
      prevWasValue = ch === ')';
    } else if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      result += ch;
      prevWasValue = false;
    } else if (ch === ' ') {
      prevWasValue = false;
    }
  }

  return result;
}

function processMultiplier(input: string): string {
  return input.replace(/(\d)([a-zA-Z(])/g, (_, d, next) => {
    if (next >= 'a' && next <= 'z') {
      return `${d}*${next}`;
    }
    return `${d}${next}`;
  });
}

function formatResult(num: number): string {
  if (Number.isInteger(num) && Math.abs(num) < 1e15) {
    return num.toLocaleString('en-US');
  }
  if (Math.abs(num) < 0.0001 || Math.abs(num) >= 1e15) {
    return num.toExponential(6);
  }
  const rounded = parseFloat(num.toFixed(10));
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 10 });
}

export default class CalcCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Calculate a math expression')
    .addStringOption((option) =>
      option.setName('expression').setDescription('Math expression to evaluate').setRequired(true),
    );

  category = 'Utility';
  cooldown = 3;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const raw = interaction.options.getString('expression', true);

    try {
      const processed = processMultiplier(sanitizeInput(raw));
      const tokens = tokenize(processed);
      const result = evaluate(tokens);

      if (!isFinite(result)) {
        throw new Error('Result is not a finite number');
      }

      const embed = new EmbedBuilder()
        .setTitle('🔢 Calculator')
        .setColor(Colors.Blurple)
        .addFields(
          { name: 'Expression', value: `\`${raw}\``, inline: false },
          { name: 'Result', value: `\`${formatResult(result)}\``, inline: false },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid expression';
      await interaction.reply({
        content: `❌ Error: ${message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
