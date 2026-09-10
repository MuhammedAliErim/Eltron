import { describe, it, expect } from 'vitest';
import Ping from '../src/commands/utility/Ping';
import BotInfo from '../src/commands/utility/BotInfo';
import Uptime from '../src/commands/utility/Uptime';
import UserInfo from '../src/commands/utility/UserInfo';
import ServerInfo from '../src/commands/utility/ServerInfo';
import Stats from '../src/commands/utility/Stats';
import Snipe from '../src/commands/utility/Snipe';
import Embed from '../src/commands/utility/Embed';
import Task from '../src/commands/utility/Task';
import Slowmode from '../src/commands/moderation/Slowmode';
import Lock from '../src/commands/moderation/Lock';
import Unlock from '../src/commands/moderation/Unlock';
import Nick from '../src/commands/moderation/Nick';
import ReactionRole from '../src/commands/role/ReactionRole';
import { PermissionFlagsBits } from 'discord.js';

describe('New Commands — Command Metadata', () => {
  const utilityCommands = [
    { name: 'ping', command: Ping, expectedCategory: 'Utility', expectedCooldown: 5 },
    { name: 'botinfo', command: BotInfo, expectedCategory: 'Utility', expectedCooldown: 5 },
    { name: 'uptime', command: Uptime, expectedCategory: 'Utility', expectedCooldown: 5 },
    { name: 'userinfo', command: UserInfo, expectedCategory: 'Utility', expectedCooldown: 5 },
    { name: 'serverinfo', command: ServerInfo, expectedCategory: 'Utility', expectedCooldown: 10 },
    { name: 'stats', command: Stats, expectedCategory: 'Utility', expectedCooldown: 10 },
    { name: 'snipe', command: Snipe, expectedCategory: 'Utility', expectedCooldown: 5 },
    { name: 'embed', command: Embed, expectedCategory: 'Utility', expectedCooldown: 10 },
    { name: 'task', command: Task, expectedCategory: 'Utility', expectedCooldown: 5 },
  ];

  const moderationCommands = [
    { name: 'slowmode', command: Slowmode, expectedCategory: 'Moderation', expectedCooldown: 5 },
    { name: 'lock', command: Lock, expectedCategory: 'Moderation', expectedCooldown: 5 },
    { name: 'unlock', command: Unlock, expectedCategory: 'Moderation', expectedCooldown: 5 },
    { name: 'nick', command: Nick, expectedCategory: 'Moderation', expectedCooldown: 5 },
  ];

  const roleCommands = [
    { name: 'reactionrole', command: ReactionRole, expectedCategory: 'Roles', expectedCooldown: 5 },
  ];

  const allCommands = [...utilityCommands, ...moderationCommands, ...roleCommands];

  it.each(allCommands.map(c => [c.name, c]))(
    '%s has correct name',
    (_name, c) => {
      const instance = new (c.command as any)();
      expect(instance.data.name).toBe(c.name);
    },
  );

  it.each(utilityCommands.map(c => [c.name, c]))(
    '%s has correct category',
    (_name, c) => {
      const instance = new (c.command as any)();
      expect(instance.category).toBe(c.expectedCategory);
    },
  );

  it.each(moderationCommands.map(c => [c.name, c]))(
    '%s has correct category',
    (_name, c) => {
      const instance = new (c.command as any)();
      expect(instance.category).toBe(c.expectedCategory);
    },
  );

  it.each(roleCommands.map(c => [c.name, c]))(
    '%s has correct category',
    (_name, c) => {
      const instance = new (c.command as any)();
      expect(instance.category).toBe(c.expectedCategory);
    },
  );

  it.each(allCommands.map(c => [c.name, c]))(
    '%s has valid cooldown',
    (_name, c) => {
      const instance = new (c.command as any)();
      expect(instance.cooldown).toBe(c.expectedCooldown);
      expect(instance.cooldown).toBeGreaterThan(0);
    },
  );
});

describe('New Commands — Required Permissions', () => {
  it('Slowmode has requiredPermissions', () => {
    const instance = new Slowmode();
    expect(instance.requiredPermissions).toBeDefined();
    expect(instance.requiredPermissions).toContain(PermissionFlagsBits.ManageChannels);
  });

  it('Lock has requiredPermissions', () => {
    const instance = new Lock();
    expect(instance.requiredPermissions).toBeDefined();
    expect(instance.requiredPermissions).toContain(PermissionFlagsBits.ManageChannels);
  });

  it('Unlock has requiredPermissions', () => {
    const instance = new Unlock();
    expect(instance.requiredPermissions).toBeDefined();
    expect(instance.requiredPermissions).toContain(PermissionFlagsBits.ManageChannels);
  });

  it('Nick has requiredPermissions', () => {
    const instance = new Nick();
    expect(instance.requiredPermissions).toBeDefined();
    expect(instance.requiredPermissions).toContain(PermissionFlagsBits.ManageNicknames);
  });

  it('Task has requiredPermissions', () => {
    const instance = new Task();
    expect(instance.requiredPermissions).toBeDefined();
    expect(instance.requiredPermissions).toContain(PermissionFlagsBits.ManageGuild);
  });

  it('ReactionRole has requiredPermissions', () => {
    const instance = new ReactionRole();
    expect(instance.requiredPermissions).toBeDefined();
    expect(instance.requiredPermissions).toContain(PermissionFlagsBits.ManageRoles);
  });

  it('Embed has requiredPermissions via data', () => {
    const instance = new Embed();
    expect(instance.data.default_member_permissions).toBeDefined();
  });

  it('Ping has no requiredPermissions', () => {
    const instance = new Ping();
    expect(instance.requiredPermissions).toBeUndefined();
  });

  it('BotInfo has no requiredPermissions', () => {
    const instance = new BotInfo();
    expect(instance.requiredPermissions).toBeUndefined();
  });

  it('Uptime has no requiredPermissions', () => {
    const instance = new Uptime();
    expect(instance.requiredPermissions).toBeUndefined();
  });

  it('UserInfo has no requiredPermissions', () => {
    const instance = new UserInfo();
    expect(instance.requiredPermissions).toBeUndefined();
  });

  it('ServerInfo has no requiredPermissions', () => {
    const instance = new ServerInfo();
    expect(instance.requiredPermissions).toBeUndefined();
  });

  it('Stats has no requiredPermissions', () => {
    const instance = new Stats();
    expect(instance.requiredPermissions).toBeUndefined();
  });

  it('Snipe has no requiredPermissions', () => {
    const instance = new Snipe();
    expect(instance.requiredPermissions).toBeUndefined();
  });
});

describe('New Commands — Subcommands', () => {
  it('ReactionRole has create subcommand', () => {
    const instance = new ReactionRole();
    const options = (instance.data as any).options;
    const sub = options.find((o: any) => o.name === 'create');
    expect(sub).toBeDefined();
  });

  it('ReactionRole has remove subcommand', () => {
    const instance = new ReactionRole();
    const options = (instance.data as any).options;
    const sub = options.find((o: any) => o.name === 'remove');
    expect(sub).toBeDefined();
  });

  it('ReactionRole has list subcommand', () => {
    const instance = new ReactionRole();
    const options = (instance.data as any).options;
    const sub = options.find((o: any) => o.name === 'list');
    expect(sub).toBeDefined();
  });

  it('Task has create subcommand', () => {
    const instance = new Task();
    const options = (instance.data as any).options;
    const sub = options.find((o: any) => o.name === 'create');
    expect(sub).toBeDefined();
  });

  it('Task has remove subcommand', () => {
    const instance = new Task();
    const options = (instance.data as any).options;
    const sub = options.find((o: any) => o.name === 'remove');
    expect(sub).toBeDefined();
  });

  it('Task has list subcommand', () => {
    const instance = new Task();
    const options = (instance.data as any).options;
    const sub = options.find((o: any) => o.name === 'list');
    expect(sub).toBeDefined();
  });

  it('Task has enable subcommand', () => {
    const instance = new Task();
    const options = (instance.data as any).options;
    const sub = options.find((o: any) => o.name === 'enable');
    expect(sub).toBeDefined();
  });

  it('Task has disable subcommand', () => {
    const instance = new Task();
    const options = (instance.data as any).options;
    const sub = options.find((o: any) => o.name === 'disable');
    expect(sub).toBeDefined();
  });
});

describe('New Commands — Options', () => {
  it('UserInfo has user option', () => {
    const instance = new UserInfo();
    const options = (instance.data as any).options;
    const userOpt = options.find((o: any) => o.name === 'user');
    expect(userOpt).toBeDefined();
  });

  it('UserInfo user option is not required', () => {
    const instance = new UserInfo();
    const options = (instance.data as any).options;
    const userOpt = options.find((o: any) => o.name === 'user');
    expect(userOpt.required).toBe(false);
  });

  it('ServerInfo has no options', () => {
    const instance = new ServerInfo();
    const options = (instance.data as any).options;
    expect(options).toHaveLength(0);
  });

  it('Embed has title option', () => {
    const instance = new Embed();
    const options = (instance.data as any).options;
    const titleOpt = options.find((o: any) => o.name === 'title');
    expect(titleOpt).toBeDefined();
  });

  it('Embed has description option', () => {
    const instance = new Embed();
    const options = (instance.data as any).options;
    const descOpt = options.find((o: any) => o.name === 'description');
    expect(descOpt).toBeDefined();
  });

  it('Embed title and description are required', () => {
    const instance = new Embed();
    const options = (instance.data as any).options;
    const titleOpt = options.find((o: any) => o.name === 'title');
    const descOpt = options.find((o: any) => o.name === 'description');
    expect(titleOpt.required).toBe(true);
    expect(descOpt.required).toBe(true);
  });

  it('Embed has optional color option', () => {
    const instance = new Embed();
    const options = (instance.data as any).options;
    const colorOpt = options.find((o: any) => o.name === 'color');
    expect(colorOpt).toBeDefined();
    expect(colorOpt.required).toBe(false);
  });

  it('Embed has optional channel option', () => {
    const instance = new Embed();
    const options = (instance.data as any).options;
    const channelOpt = options.find((o: any) => o.name === 'channel');
    expect(channelOpt).toBeDefined();
    expect(channelOpt.required).toBe(false);
  });

  it('Slowmode has channel option', () => {
    const instance = new Slowmode();
    const options = (instance.data as any).options;
    const channelOpt = options.find((o: any) => o.name === 'channel');
    expect(channelOpt).toBeDefined();
  });

  it('Slowmode has duration option', () => {
    const instance = new Slowmode();
    const options = (instance.data as any).options;
    const durationOpt = options.find((o: any) => o.name === 'duration');
    expect(durationOpt).toBeDefined();
  });

  it('Slowmode channel and duration are required', () => {
    const instance = new Slowmode();
    const options = (instance.data as any).options;
    const channelOpt = options.find((o: any) => o.name === 'channel');
    const durationOpt = options.find((o: any) => o.name === 'duration');
    expect(channelOpt.required).toBe(true);
    expect(durationOpt.required).toBe(true);
  });

  it('Lock has channel option', () => {
    const instance = new Lock();
    const options = (instance.data as any).options;
    const channelOpt = options.find((o: any) => o.name === 'channel');
    expect(channelOpt).toBeDefined();
  });

  it('Lock channel is not required', () => {
    const instance = new Lock();
    const options = (instance.data as any).options;
    const channelOpt = options.find((o: any) => o.name === 'channel');
    expect(channelOpt.required).toBe(false);
  });

  it('Unlock has channel option', () => {
    const instance = new Unlock();
    const options = (instance.data as any).options;
    const channelOpt = options.find((o: any) => o.name === 'channel');
    expect(channelOpt).toBeDefined();
  });

  it('Unlock channel is not required', () => {
    const instance = new Unlock();
    const options = (instance.data as any).options;
    const channelOpt = options.find((o: any) => o.name === 'channel');
    expect(channelOpt.required).toBe(false);
  });

  it('Nick has member option', () => {
    const instance = new Nick();
    const options = (instance.data as any).options;
    const memberOpt = options.find((o: any) => o.name === 'member');
    expect(memberOpt).toBeDefined();
  });

  it('Nick has nickname option', () => {
    const instance = new Nick();
    const options = (instance.data as any).options;
    const nickOpt = options.find((o: any) => o.name === 'nickname');
    expect(nickOpt).toBeDefined();
  });

  it('Nick member is required', () => {
    const instance = new Nick();
    const options = (instance.data as any).options;
    const memberOpt = options.find((o: any) => o.name === 'member');
    expect(memberOpt.required).toBe(true);
  });

  it('Nick nickname is not required', () => {
    const instance = new Nick();
    const options = (instance.data as any).options;
    const nickOpt = options.find((o: any) => o.name === 'nickname');
    expect(nickOpt.required).toBe(false);
  });
});

describe('New Commands — Descriptions', () => {
  const allCommands = [
    { name: 'ping', command: Ping },
    { name: 'botinfo', command: BotInfo },
    { name: 'uptime', command: Uptime },
    { name: 'userinfo', command: UserInfo },
    { name: 'serverinfo', command: ServerInfo },
    { name: 'stats', command: Stats },
    { name: 'snipe', command: Snipe },
    { name: 'embed', command: Embed },
    { name: 'task', command: Task },
    { name: 'slowmode', command: Slowmode },
    { name: 'lock', command: Lock },
    { name: 'unlock', command: Unlock },
    { name: 'nick', command: Nick },
    { name: 'reactionrole', command: ReactionRole },
  ];

  it.each(allCommands.map(c => [c.name, c]))(
    '%s has a description',
    (_name, c) => {
      const instance = new (c.command as any)();
      expect(instance.data.description).toBeDefined();
      expect(instance.data.description.length).toBeGreaterThan(0);
    },
  );
});
