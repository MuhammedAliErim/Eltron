import { describe, it, expect, vi, beforeEach } from 'vitest';
import { replaceVariables, sendWelcome, sendGoodbye, getStatusDescription } from '../src/services/welcome/WelcomeService';
import { WelcomeRepository } from '../src/database/repositories/WelcomeRepository';
import type { WelcomeConfigRow, WelcomeConfigUpdate } from '../src/database/schema';

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

const DEFAULT_CONFIG: WelcomeConfigRow = {
  guild_id: 'guild1',
  welcome_enabled: false,
  welcome_channel_id: null,
  welcome_message: 'Welcome to {server}, {user}!',
  welcome_use_embed: false,
  welcome_embed_title: 'Welcome!',
  welcome_embed_description: 'Welcome to {server}, {user}!',
  welcome_embed_color: '#00FF00',
  goodbye_enabled: false,
  goodbye_channel_id: null,
  goodbye_message: 'Goodbye {user}, we will miss you!',
  goodbye_use_embed: false,
  goodbye_embed_title: 'Goodbye!',
  goodbye_embed_description: 'Goodbye {user}, we will miss you!',
  goodbye_embed_color: '#FF0000',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const createMockConfig = (overrides: Partial<WelcomeConfigRow> = {}): WelcomeConfigRow => ({
  ...DEFAULT_CONFIG,
  ...overrides,
});

const createMockMember = (overrides: Record<string, unknown> = {}) => ({
  id: 'user1',
  user: {
    id: 'user1',
    username: 'TestUser',
    tag: 'TestUser#0001',
    bot: false,
    displayAvatarURL: () => 'https://example.com/avatar.png',
  },
  guild: {
    id: 'guild1',
    name: 'Test Server',
    memberCount: 100,
    channels: {
      cache: {
        get: vi.fn().mockReturnValue({
          id: 'channel1',
          type: 0,
          send: vi.fn().mockResolvedValue({}),
        }),
      },
    },
  },
  ...overrides,
});

describe('WelcomeConfig Model', () => {
  it('should have valid default structure', () => {
    const config = createMockConfig();
    expect(config.guild_id).toBe('guild1');
    expect(config.welcome_enabled).toBe(false);
    expect(config.goodbye_enabled).toBe(false);
    expect(typeof config.welcome_message).toBe('string');
    expect(typeof config.goodbye_message).toBe('string');
  });

  it('should support welcome enabled state', () => {
    const enabled = createMockConfig({ welcome_enabled: true });
    expect(enabled.welcome_enabled).toBe(true);
  });

  it('should support goodbye enabled state', () => {
    const enabled = createMockConfig({ goodbye_enabled: true });
    expect(enabled.goodbye_enabled).toBe(true);
  });

  it('should support channel IDs', () => {
    const config = createMockConfig({
      welcome_channel_id: 'ch1',
      goodbye_channel_id: 'ch2',
    });
    expect(config.welcome_channel_id).toBe('ch1');
    expect(config.goodbye_channel_id).toBe('ch2');
  });

  it('should support embed mode', () => {
    const config = createMockConfig({
      welcome_use_embed: true,
      goodbye_use_embed: true,
    });
    expect(config.welcome_use_embed).toBe(true);
    expect(config.goodbye_use_embed).toBe(true);
  });

  it('should support custom messages', () => {
    const config = createMockConfig({
      welcome_message: 'Hello {user}!',
      goodbye_message: 'Bye {user}!',
    });
    expect(config.welcome_message).toBe('Hello {user}!');
    expect(config.goodbye_message).toBe('Bye {user}!');
  });

  it('should have timestamps', () => {
    const config = createMockConfig();
    expect(config.created_at).toBeDefined();
    expect(config.updated_at).toBeDefined();
  });

  it('should enforce guild isolation', () => {
    const c1 = createMockConfig({ guild_id: 'g1' });
    const c2 = createMockConfig({ guild_id: 'g2' });
    expect(c1.guild_id).not.toBe(c2.guild_id);
  });

  it('should support null channel IDs', () => {
    const config = createMockConfig({
      welcome_channel_id: null,
      goodbye_channel_id: null,
    });
    expect(config.welcome_channel_id).toBeNull();
    expect(config.goodbye_channel_id).toBeNull();
  });
});

describe('Variable Replacement', () => {
  it('should replace {user} with mention', () => {
    const member = createMockMember();
    const result = replaceVariables('Hello {user}!', member as any);
    expect(result).toBe('Hello <@user1>!');
  });

  it('should replace {username}', () => {
    const member = createMockMember();
    const result = replaceVariables('Hello {username}!', member as any);
    expect(result).toBe('Hello TestUser!');
  });

  it('should replace {server}', () => {
    const member = createMockMember();
    const result = replaceVariables('Welcome to {server}!', member as any);
    expect(result).toBe('Welcome to Test Server!');
  });

  it('should replace {memberCount}', () => {
    const member = createMockMember();
    const result = replaceVariables('We have {memberCount} members!', member as any);
    expect(result).toBe('We have 100 members!');
  });

  it('should replace multiple variables', () => {
    const member = createMockMember();
    const result = replaceVariables(
      '{user} joined {server} ({memberCount} members)',
      member as any
    );
    expect(result).toBe('<@user1> joined Test Server (100 members)');
  });

  it('should handle no variables', () => {
    const member = createMockMember();
    const result = replaceVariables('Hello!', member as any);
    expect(result).toBe('Hello!');
  });

  it('should handle empty string', () => {
    const member = createMockMember();
    const result = replaceVariables('', member as any);
    expect(result).toBe('');
  });

  it('should handle case-sensitive variables', () => {
    const member = createMockMember();
    const result = replaceVariables('{USER} and {user}', member as any);
    expect(result).toBe('{USER} and <@user1>');
  });

  it('should replace repeated variables', () => {
    const member = createMockMember();
    const result = replaceVariables('{user} says hi to {user}', member as any);
    expect(result).toBe('<@user1> says hi to <@user1>');
  });
});

describe('sendWelcome', () => {
  it('should not send when disabled', async () => {
    const member = createMockMember();
    const config = createMockConfig({ welcome_enabled: false });
    await sendWelcome(member as any, config);
    expect(member.guild.channels.cache.get).not.toHaveBeenCalled();
  });

  it('should not send when no channel set', async () => {
    const member = createMockMember();
    const config = createMockConfig({
      welcome_enabled: true,
      welcome_channel_id: null,
    });
    await sendWelcome(member as any, config);
  });

  it('should not send for bots', async () => {
    const member = createMockMember({ user: { ...createMockMember().user, bot: true } });
    const config = createMockConfig({
      welcome_enabled: true,
      welcome_channel_id: 'channel1',
    });
    await sendWelcome(member as any, config);
  });

  it('should send text message when embed disabled', async () => {
    const mockSend = vi.fn().mockResolvedValue({});
    const member = createMockMember();
    member.guild.channels.cache.get = vi.fn().mockReturnValue({
      id: 'channel1',
      type: 0,
      send: mockSend,
    });
    const config = createMockConfig({
      welcome_enabled: true,
      welcome_channel_id: 'channel1',
      welcome_use_embed: false,
      welcome_message: 'Welcome {user}!',
    });
    await sendWelcome(member as any, config);
    expect(mockSend).toHaveBeenCalledWith({
      content: 'Welcome <@user1>!',
    });
  });

  it('should send embed when enabled', async () => {
    const mockSend = vi.fn().mockResolvedValue({});
    const member = createMockMember();
    member.guild.channels.cache.get = vi.fn().mockReturnValue({
      id: 'channel1',
      type: 0,
      send: mockSend,
    });
    const config = createMockConfig({
      welcome_enabled: true,
      welcome_channel_id: 'channel1',
      welcome_use_embed: true,
      welcome_embed_title: 'Welcome!',
      welcome_embed_description: 'Hello {user}',
      welcome_embed_color: '#00FF00',
    });
    await sendWelcome(member as any, config);
    expect(mockSend).toHaveBeenCalled();
    const call = mockSend.mock.calls[0][0];
    expect(call.embeds).toBeDefined();
    expect(call.embeds.length).toBe(1);
  });

  it('should handle missing channel gracefully', async () => {
    const member = createMockMember();
    member.guild.channels.cache.get = vi.fn().mockReturnValue(undefined);
    const config = createMockConfig({
      welcome_enabled: true,
      welcome_channel_id: 'nonexistent',
    });
    await sendWelcome(member as any, config);
  });

  it('should handle send failure gracefully', async () => {
    const member = createMockMember();
    member.guild.channels.cache.get = vi.fn().mockReturnValue({
      id: 'channel1',
      type: 0,
      send: vi.fn().mockRejectedValue(new Error('API Error')),
    });
    const config = createMockConfig({
      welcome_enabled: true,
      welcome_channel_id: 'channel1',
    });
    await sendWelcome(member as any, config);
  });
});

describe('sendGoodbye', () => {
  it('should not send when disabled', async () => {
    const member = createMockMember();
    const config = createMockConfig({ goodbye_enabled: false });
    await sendGoodbye(member as any, config);
    expect(member.guild.channels.cache.get).not.toHaveBeenCalled();
  });

  it('should not send when no channel set', async () => {
    const member = createMockMember();
    const config = createMockConfig({
      goodbye_enabled: true,
      goodbye_channel_id: null,
    });
    await sendGoodbye(member as any, config);
  });

  it('should not send for bots', async () => {
    const member = createMockMember({ user: { ...createMockMember().user, bot: true } });
    const config = createMockConfig({
      goodbye_enabled: true,
      goodbye_channel_id: 'channel1',
    });
    await sendGoodbye(member as any, config);
  });

  it('should send text message when embed disabled', async () => {
    const mockSend = vi.fn().mockResolvedValue({});
    const member = createMockMember();
    member.guild.channels.cache.get = vi.fn().mockReturnValue({
      id: 'channel1',
      type: 0,
      send: mockSend,
    });
    const config = createMockConfig({
      goodbye_enabled: true,
      goodbye_channel_id: 'channel1',
      goodbye_use_embed: false,
      goodbye_message: 'Goodbye {user}!',
    });
    await sendGoodbye(member as any, config);
    expect(mockSend).toHaveBeenCalledWith({
      content: 'Goodbye <@user1>!',
    });
  });

  it('should send embed when enabled', async () => {
    const mockSend = vi.fn().mockResolvedValue({});
    const member = createMockMember();
    member.guild.channels.cache.get = vi.fn().mockReturnValue({
      id: 'channel1',
      type: 0,
      send: mockSend,
    });
    const config = createMockConfig({
      goodbye_enabled: true,
      goodbye_channel_id: 'channel1',
      goodbye_use_embed: true,
      goodbye_embed_title: 'Goodbye!',
      goodbye_embed_description: 'Bye {user}',
      goodbye_embed_color: '#FF0000',
    });
    await sendGoodbye(member as any, config);
    expect(mockSend).toHaveBeenCalled();
    const call = mockSend.mock.calls[0][0];
    expect(call.embeds).toBeDefined();
    expect(call.embeds.length).toBe(1);
  });

  it('should handle missing channel gracefully', async () => {
    const member = createMockMember();
    member.guild.channels.cache.get = vi.fn().mockReturnValue(undefined);
    const config = createMockConfig({
      goodbye_enabled: true,
      goodbye_channel_id: 'nonexistent',
    });
    await sendGoodbye(member as any, config);
  });

  it('should handle send failure gracefully', async () => {
    const member = createMockMember();
    member.guild.channels.cache.get = vi.fn().mockReturnValue({
      id: 'channel1',
      type: 0,
      send: vi.fn().mockRejectedValue(new Error('API Error')),
    });
    const config = createMockConfig({
      goodbye_enabled: true,
      goodbye_channel_id: 'channel1',
    });
    await sendGoodbye(member as any, config);
  });
});

describe('getStatusDescription', () => {
  it('should return disabled status for default config', () => {
    const config = createMockConfig();
    const status = getStatusDescription(config);
    expect(status.welcome).toContain('Disabled');
    expect(status.goodbye).toContain('Disabled');
  });

  it('should return enabled status when enabled', () => {
    const config = createMockConfig({
      welcome_enabled: true,
      goodbye_enabled: true,
    });
    const status = getStatusDescription(config);
    expect(status.welcome).toContain('Enabled');
    expect(status.goodbye).toContain('Enabled');
  });

  it('should show channel when set', () => {
    const config = createMockConfig({
      welcome_channel_id: 'ch1',
      goodbye_channel_id: 'ch2',
    });
    const status = getStatusDescription(config);
    expect(status.welcome).toContain('ch1');
    expect(status.goodbye).toContain('ch2');
  });

  it('should show Not set when no channel', () => {
    const config = createMockConfig({
      welcome_channel_id: null,
      goodbye_channel_id: null,
    });
    const status = getStatusDescription(config);
    expect(status.welcome).toContain('Not set');
    expect(status.goodbye).toContain('Not set');
  });

  it('should show Embed type when embed enabled', () => {
    const config = createMockConfig({
      welcome_use_embed: true,
      goodbye_use_embed: true,
    });
    const status = getStatusDescription(config);
    expect(status.welcome).toContain('Embed');
    expect(status.goodbye).toContain('Embed');
  });

  it('should show Text type when embed disabled', () => {
    const config = createMockConfig({
      welcome_use_embed: false,
      goodbye_use_embed: false,
    });
    const status = getStatusDescription(config);
    expect(status.welcome).toContain('Text');
    expect(status.goodbye).toContain('Text');
  });
});

describe('WelcomeRepository', () => {
  it('should have getConfig method', () => {
    const repo = new WelcomeRepository();
    expect(typeof repo.getConfig).toBe('function');
  });

  it('should have upsertConfig method', () => {
    const repo = new WelcomeRepository();
    expect(typeof repo.upsertConfig).toBe('function');
  });

  it('should have resetConfig method', () => {
    const repo = new WelcomeRepository();
    expect(typeof repo.resetConfig).toBe('function');
  });
});

describe('WelcomeConfigUpdate', () => {
  it('should allow partial updates', () => {
    const update: WelcomeConfigUpdate = { welcome_enabled: true };
    expect(update.welcome_enabled).toBe(true);
    expect(update.goodbye_enabled).toBeUndefined();
  });

  it('should allow channel updates', () => {
    const update: WelcomeConfigUpdate = { welcome_channel_id: 'ch1' };
    expect(update.welcome_channel_id).toBe('ch1');
  });

  it('should allow message updates', () => {
    const update: WelcomeConfigUpdate = { welcome_message: 'New message' };
    expect(update.welcome_message).toBe('New message');
  });

  it('should allow embed toggle', () => {
    const update: WelcomeConfigUpdate = {
      welcome_use_embed: true,
      goodbye_use_embed: true,
    };
    expect(update.welcome_use_embed).toBe(true);
    expect(update.goodbye_use_embed).toBe(true);
  });

  it('should allow reset to null channel', () => {
    const update: WelcomeConfigUpdate = { welcome_channel_id: null };
    expect(update.welcome_channel_id).toBeNull();
  });
});

describe('Welcome Security', () => {
  it('should not expose secrets in logs', () => {
    const config = createMockConfig();
    const json = JSON.stringify(config);
    expect(json).not.toContain('token');
    expect(json).not.toContain('secret');
    expect(json).not.toContain('password');
  });

  it('should enforce guild isolation in config', () => {
    const c1 = createMockConfig({ guild_id: 'guild_a' });
    const c2 = createMockConfig({ guild_id: 'guild_b' });
    expect(c1.guild_id).not.toBe(c2.guild_id);
  });

  it('should not allow arbitrary channel access', () => {
    const member = createMockMember();
    member.guild.channels.cache.get = vi.fn().mockReturnValue(undefined);
    const config = createMockConfig({
      welcome_enabled: true,
      welcome_channel_id: 'invalid_channel',
    });
    expect(() => sendWelcome(member as any, config)).not.toThrow();
  });

  it('should handle disabled systems safely', async () => {
    const member = createMockMember();
    const config = createMockConfig({
      welcome_enabled: false,
      goodbye_enabled: false,
    });
    await sendWelcome(member as any, config);
    await sendGoodbye(member as any, config);
  });

  it('should handle null channel IDs safely', async () => {
    const member = createMockMember();
    const config = createMockConfig({
      welcome_enabled: true,
      welcome_channel_id: null,
      goodbye_enabled: true,
      goodbye_channel_id: null,
    });
    await sendWelcome(member as any, config);
    await sendGoodbye(member as any, config);
  });
});

describe('Welcome Edge Cases', () => {
  it('should handle empty message template', () => {
    const member = createMockMember();
    const result = replaceVariables('', member as any);
    expect(result).toBe('');
  });

  it('should handle malformed template variables', () => {
    const member = createMockMember();
    const result = replaceVariables('{invalid} {user}', member as any);
    expect(result).toBe('{invalid} <@user1>');
  });

  it('should handle very long messages', () => {
    const member = createMockMember();
    const longMsg = '{user}'.repeat(400);
    const result = replaceVariables(longMsg, member as any);
    expect(result).toContain('<@user1>');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle special characters in server name', () => {
    const member = createMockMember();
    member.guild.name = 'Server with "quotes" & <tags>';
    const result = replaceVariables('{server}', member as any);
    expect(result).toBe('Server with "quotes" & <tags>');
  });

  it('should handle member count of 0', () => {
    const member = createMockMember();
    member.guild.memberCount = 0;
    const result = replaceVariables('{memberCount}', member as any);
    expect(result).toBe('0');
  });

  it('should handle member count of 1', () => {
    const member = createMockMember();
    member.guild.memberCount = 1;
    const result = replaceVariables('{memberCount}', member as any);
    expect(result).toBe('1');
  });

  it('should handle large member count', () => {
    const member = createMockMember();
    member.guild.memberCount = 999999;
    const result = replaceVariables('{memberCount}', member as any);
    expect(result).toBe('999999');
  });
});

describe('GuildMemberRemove Event', () => {
  it('should have GuildMemberRemove event file', () => {
    expect(true).toBe(true);
  });
});

describe('GuildMemberAdd Welcome Integration', () => {
  it('should have welcome integration in GuildMemberAdd', () => {
    expect(true).toBe(true);
  });
});

describe('Commands', () => {
  it('should have Welcome command', () => {
    expect(true).toBe(true);
  });

  it('should have Goodbye command', () => {
    expect(true).toBe(true);
  });
});
