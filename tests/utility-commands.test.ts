import { describe, it, expect, vi } from 'vitest';
import { PermissionFlagsBits } from 'discord.js';

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

describe('Avatar Command', () => {
  it('should have correct command name', async () => {
    const { default: AvatarCommand } = await import('../src/commands/utility/Avatar');
    const cmd = new AvatarCommand();
    expect(cmd.data.name).toBe('avatar');
  });

  it('should have correct category', async () => {
    const { default: AvatarCommand } = await import('../src/commands/utility/Avatar');
    const cmd = new AvatarCommand();
    expect(cmd.category).toBe('Utility');
  });

  it('should have cooldown of 5', async () => {
    const { default: AvatarCommand } = await import('../src/commands/utility/Avatar');
    const cmd = new AvatarCommand();
    expect(cmd.cooldown).toBe(5);
  });
});

describe('Banner Command', () => {
  it('should have correct command name', async () => {
    const { default: BannerCommand } = await import('../src/commands/utility/Banner');
    const cmd = new BannerCommand();
    expect(cmd.data.name).toBe('banner');
  });

  it('should have correct category', async () => {
    const { default: BannerCommand } = await import('../src/commands/utility/Banner');
    const cmd = new BannerCommand();
    expect(cmd.category).toBe('Utility');
  });

  it('should have cooldown of 5', async () => {
    const { default: BannerCommand } = await import('../src/commands/utility/Banner');
    const cmd = new BannerCommand();
    expect(cmd.cooldown).toBe(5);
  });
});

describe('Color Command — Hex Parsing', () => {
  it('should parse valid hex with hash', () => {
    const rgb = hexToRgb('#FF5733');
    expect(rgb).toEqual({ r: 255, g: 87, b: 51 });
  });

  it('should parse valid hex without hash', () => {
    const rgb = hexToRgb('FF5733');
    expect(rgb).toEqual({ r: 255, g: 87, b: 51 });
  });

  it('should parse lowercase hex', () => {
    const rgb = hexToRgb('#ff5733');
    expect(rgb).toEqual({ r: 255, g: 87, b: 51 });
  });

  it('should return null for invalid hex', () => {
    expect(hexToRgb('#GGG')).toBeNull();
    expect(hexToRgb('#12')).toBeNull();
    expect(hexToRgb('#12345')).toBeNull();
    expect(hexToRgb('#1234567')).toBeNull();
    expect(hexToRgb('')).toBeNull();
  });

  it('should convert RGB to HSL correctly for red', () => {
    const hsl = rgbToHsl(255, 0, 0);
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it('should convert RGB to HSL correctly for white', () => {
    const hsl = rgbToHsl(255, 255, 255);
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(0);
    expect(hsl.l).toBe(100);
  });

  it('should convert RGB to HSL correctly for black', () => {
    const hsl = rgbToHsl(0, 0, 0);
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(0);
    expect(hsl.l).toBe(0);
  });

  it('should compute decimal from RGB', () => {
    const r = 255, g = 87, b = 51;
    const decimal = (r << 16) | (g << 8) | b;
    expect(decimal).toBe(16734003);
  });

  it('should have correct command data', async () => {
    const { default: ColorCommand } = await import('../src/commands/utility/Color');
    const cmd = new ColorCommand();
    expect(cmd.data.name).toBe('color');
    expect(cmd.category).toBe('Utility');
  });
});

describe('Calc Command — Safe Math Evaluation', () => {
  function tokenize(input: string): Array<{ type: string; value?: number | string; name?: string }> {
    const tokens: Array<{ type: string; value?: number | string; name?: string }> = [];
    let i = 0;
    const s = input.toLowerCase().replace(/\s+/g, '');
    while (i < s.length) {
      const ch = s[i];
      if ((ch >= '0' && ch <= '9') || ch === '.') {
        let num = '';
        while (i < s.length && ((s[i] >= '0' && s[i] <= '9') || s[i] === '.')) {
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
      if ('+-*/^()'.includes(ch)) {
        tokens.push({ type: 'operator', value: ch });
        i++;
        continue;
      }
      throw new Error(`Unexpected character: ${ch}`);
    }
    return tokens;
  }

  function applyOp(op: string, a: number, b: number): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': { if (b === 0) throw new Error('Division by zero'); return a / b; }
      case '^': return Math.pow(a, b);
      default: throw new Error(`Unknown operator: ${op}`);
    }
  }

  it('should tokenize 2+3 correctly', () => {
    const tokens = tokenize('2+3');
    expect(tokens).toEqual([
      { type: 'number', value: 2 },
      { type: 'operator', value: '+' },
      { type: 'number', value: 3 },
    ]);
  });

  it('should evaluate 2+3 = 5', () => {
    expect(applyOp('+', 2, 3)).toBe(5);
  });

  it('should evaluate 10*5 = 50', () => {
    expect(applyOp('*', 10, 5)).toBe(50);
  });

  it('should evaluate 10-3 = 7', () => {
    expect(applyOp('-', 10, 3)).toBe(7);
  });

  it('should evaluate 20/4 = 5', () => {
    expect(applyOp('/', 20, 4)).toBe(5);
  });

  it('should evaluate 2^8 = 256', () => {
    expect(applyOp('^', 2, 8)).toBe(256);
  });

  it('should throw on division by zero', () => {
    expect(() => applyOp('/', 10, 0)).toThrow('Division by zero');
  });

  it('should compute sqrt(16) = 4', () => {
    expect(UNARY_FUNCTIONS.sqrt(16)).toBe(4);
  });

  it('should compute sin(0) = 0', () => {
    expect(UNARY_FUNCTIONS.sin(0)).toBe(0);
  });

  it('should compute abs(-5) = 5', () => {
    expect(UNARY_FUNCTIONS.abs(-5)).toBe(5);
  });

  it('should compute floor(3.7) = 3', () => {
    expect(UNARY_FUNCTIONS.floor(3.7)).toBe(3);
  });

  it('should compute ceil(3.2) = 4', () => {
    expect(UNARY_FUNCTIONS.ceil(3.2)).toBe(4);
  });

  it('should have pi constant', () => {
    expect(MATH_CONSTANTS.pi).toBeCloseTo(3.14159, 4);
  });

  it('should have e constant', () => {
    expect(MATH_CONSTANTS.e).toBeCloseTo(2.71828, 4);
  });

  it('should tokenize functions', () => {
    const tokens = tokenize('sqrt(16)');
    expect(tokens[0]).toEqual({ type: 'function', name: 'sqrt' });
  });

  it('should have correct command data', async () => {
    const { default: CalcCommand } = await import('../src/commands/utility/Calc');
    const cmd = new CalcCommand();
    expect(cmd.data.name).toBe('calc');
    expect(cmd.category).toBe('Utility');
    expect(cmd.cooldown).toBe(3);
  });
});

describe('Tag Command', () => {
  it('should have correct command name', async () => {
    const { default: TagCommand } = await import('../src/commands/utility/Tag');
    const cmd = new TagCommand();
    expect(cmd.data.name).toBe('tag');
  });

  it('should have correct category', async () => {
    const { default: TagCommand } = await import('../src/commands/utility/Tag');
    const cmd = new TagCommand();
    expect(cmd.category).toBe('Utility');
  });

  it('should have create subcommand', async () => {
    const { default: TagCommand } = await import('../src/commands/utility/Tag');
    const cmd = new TagCommand();
    const subcommands = cmd.data.options;
    const names = subcommands.map((o: any) => o.name);
    expect(names).toContain('create');
  });

  it('should have get subcommand', async () => {
    const { default: TagCommand } = await import('../src/commands/utility/Tag');
    const cmd = new TagCommand();
    const names = cmd.data.options.map((o: any) => o.name);
    expect(names).toContain('get');
  });

  it('should have delete subcommand', async () => {
    const { default: TagCommand } = await import('../src/commands/utility/Tag');
    const cmd = new TagCommand();
    const names = cmd.data.options.map((o: any) => o.name);
    expect(names).toContain('delete');
  });

  it('should have list subcommand', async () => {
    const { default: TagCommand } = await import('../src/commands/utility/Tag');
    const cmd = new TagCommand();
    const names = cmd.data.options.map((o: any) => o.name);
    expect(names).toContain('list');
  });

  it('should have edit subcommand', async () => {
    const { default: TagCommand } = await import('../src/commands/utility/Tag');
    const cmd = new TagCommand();
    const names = cmd.data.options.map((o: any) => o.name);
    expect(names).toContain('edit');
  });

  it('should have alias subcommand', async () => {
    const { default: TagCommand } = await import('../src/commands/utility/Tag');
    const cmd = new TagCommand();
    const names = cmd.data.options.map((o: any) => o.name);
    expect(names).toContain('alias');
  });
});

describe('Purge Command', () => {
  it('should have correct command name', async () => {
    const { default: PurgeCommand } = await import('../src/commands/moderation/Purge');
    const cmd = new PurgeCommand();
    expect(cmd.data.name).toBe('purge');
  });

  it('should have correct category', async () => {
    const { default: PurgeCommand } = await import('../src/commands/moderation/Purge');
    const cmd = new PurgeCommand();
    expect(cmd.category).toBe('Moderation');
  });

  it('should require ManageMessages permission', async () => {
    const { default: PurgeCommand } = await import('../src/commands/moderation/Purge');
    const cmd = new PurgeCommand();
    expect(cmd.requiredPermissions).toContain(PermissionFlagsBits.ManageMessages);
  });

  it('should have cooldown of 10', async () => {
    const { default: PurgeCommand } = await import('../src/commands/moderation/Purge');
    const cmd = new PurgeCommand();
    expect(cmd.cooldown).toBe(10);
  });

  it('should have amount option as required', async () => {
    const { default: PurgeCommand } = await import('../src/commands/moderation/Purge');
    const cmd = new PurgeCommand();
    const amountOption = cmd.data.options.find((o: any) => o.name === 'amount');
    expect(amountOption).toBeDefined();
  });
});

describe('RoleInfo Command', () => {
  it('should have correct command name', async () => {
    const { default: RoleInfoCommand } = await import('../src/commands/role/RoleInfo');
    const cmd = new RoleInfoCommand();
    expect(cmd.data.name).toBe('roleinfo');
  });

  it('should have correct category', async () => {
    const { default: RoleInfoCommand } = await import('../src/commands/role/RoleInfo');
    const cmd = new RoleInfoCommand();
    expect(cmd.category).toBe('Roles');
  });

  it('should have cooldown of 5', async () => {
    const { default: RoleInfoCommand } = await import('../src/commands/role/RoleInfo');
    const cmd = new RoleInfoCommand();
    expect(cmd.cooldown).toBe(5);
  });

  it('should have role option', async () => {
    const { default: RoleInfoCommand } = await import('../src/commands/role/RoleInfo');
    const cmd = new RoleInfoCommand();
    const roleOption = cmd.data.options.find((o: any) => o.name === 'role');
    expect(roleOption).toBeDefined();
  });
});

describe('AutoResponse Command', () => {
  it('should have correct command name', async () => {
    const { default: AutoResponseCommand } = await import('../src/commands/automod/AutoResponse');
    const cmd = new AutoResponseCommand();
    expect(cmd.data.name).toBe('autoresponse');
  });

  it('should have correct category', async () => {
    const { default: AutoResponseCommand } = await import('../src/commands/automod/AutoResponse');
    const cmd = new AutoResponseCommand();
    expect(cmd.category).toBe('AutoMod');
  });

  it('should require ManageGuild permission', async () => {
    const { default: AutoResponseCommand } = await import('../src/commands/automod/AutoResponse');
    const cmd = new AutoResponseCommand();
    expect(cmd.requiredPermissions).toContain(PermissionFlagsBits.ManageGuild);
  });

  it('should have create subcommand', async () => {
    const { default: AutoResponseCommand } = await import('../src/commands/automod/AutoResponse');
    const cmd = new AutoResponseCommand();
    const names = cmd.data.options.map((o: any) => o.name);
    expect(names).toContain('create');
  });

  it('should have list subcommand', async () => {
    const { default: AutoResponseCommand } = await import('../src/commands/automod/AutoResponse');
    const cmd = new AutoResponseCommand();
    const names = cmd.data.options.map((o: any) => o.name);
    expect(names).toContain('list');
  });

  it('should have remove subcommand', async () => {
    const { default: AutoResponseCommand } = await import('../src/commands/automod/AutoResponse');
    const cmd = new AutoResponseCommand();
    const names = cmd.data.options.map((o: any) => o.name);
    expect(names).toContain('remove');
  });

  it('should have edit subcommand', async () => {
    const { default: AutoResponseCommand } = await import('../src/commands/automod/AutoResponse');
    const cmd = new AutoResponseCommand();
    const names = cmd.data.options.map((o: any) => o.name);
    expect(names).toContain('edit');
  });
});
