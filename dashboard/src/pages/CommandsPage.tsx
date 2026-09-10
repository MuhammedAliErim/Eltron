import { useState, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/ui/Icon';
import { classNames } from '../lib/utils';
import type { IconName } from '../lib/icons';

interface Command {
  name: string;
  description: string;
  permissions: string[];
}

interface CommandCategory {
  name: string;
  icon: IconName;
  commands: Command[];
}

const COMMANDS_DATA: CommandCategory[] = [
  {
    name: 'Moderation',
    icon: 'Moderation',
    commands: [
      { name: 'ban', description: 'Ban a member from the server', permissions: ['Ban Members'] },
      { name: 'unban', description: 'Unban a member from the server', permissions: ['Ban Members'] },
      { name: 'kick', description: 'Kick a member from the server', permissions: ['Kick Members'] },
      { name: 'timeout', description: 'Timeout a member for a duration', permissions: ['Moderate Members'] },
      { name: 'untimeout', description: 'Remove timeout from a member', permissions: ['Moderate Members'] },
      { name: 'warn', description: 'Warn a member', permissions: ['Manage Messages'] },
      { name: 'warnings', description: 'View warnings for a member', permissions: ['Manage Messages'] },
      { name: 'clearwarnings', description: 'Clear warnings for a member', permissions: ['Manage Messages'] },
      { name: 'purge', description: 'Bulk delete messages from a channel', permissions: ['Manage Messages'] },
      { name: 'slowmode', description: 'Set slowmode for a channel', permissions: ['Manage Channels'] },
    ],
  },
  {
    name: 'Security',
    icon: 'Security',
    commands: [
      { name: 'antiraid', description: 'Configure anti-raid protection', permissions: ['Administrator'] },
      { name: 'quarantine', description: 'Quarantine a suspicious member', permissions: ['Manage Guild'] },
      { name: 'unquarantine', description: 'Release a member from quarantine', permissions: ['Manage Guild'] },
      { name: 'verify', description: 'Verify a member', permissions: ['Manage Guild'] },
      { name: 'channelwarning', description: 'Configure channel warning system', permissions: ['Manage Channels'] },
    ],
  },
  {
    name: 'Utility',
    icon: 'Bot',
    commands: [
      { name: 'help', description: 'Display all available commands', permissions: ['Everyone'] },
      { name: 'info', description: 'Show bot information and stats', permissions: ['Everyone'] },
      { name: 'ping', description: 'Check bot latency', permissions: ['Everyone'] },
      { name: 'serverinfo', description: 'Display server information', permissions: ['Everyone'] },
      { name: 'userinfo', description: 'Display user information', permissions: ['Everyone'] },
      { name: 'avatar', description: 'Get a user avatar', permissions: ['Everyone'] },
      { name: 'remind', description: 'Set a reminder', permissions: ['Everyone'] },
      { name: 'reminders', description: 'View your active reminders', permissions: ['Everyone'] },
    ],
  },
  {
    name: 'Roles',
    icon: 'Shield',
    commands: [
      { name: 'autorole', description: 'Configure automatic role assignment', permissions: ['Manage Roles'] },
      { name: 'role', description: 'Add or remove a role from a member', permissions: ['Manage Roles'] },
      { name: 'createrole', description: 'Create a new role', permissions: ['Manage Roles'] },
      { name: 'deleterole', description: 'Delete a role', permissions: ['Manage Roles'] },
      { name: 'roleinfo', description: 'Display role information', permissions: ['Everyone'] },
    ],
  },
  {
    name: 'Leveling',
    icon: 'Levels',
    commands: [
      { name: 'rank', description: 'View your or another member rank', permissions: ['Everyone'] },
      { name: 'leaderboard', description: 'Show the server leaderboard', permissions: ['Everyone'] },
      { name: 'setlevel', description: 'Set a member level', permissions: ['Manage Guild'] },
      { name: 'resetroles', description: 'Reset all level roles', permissions: ['Manage Guild'] },
    ],
  },
  {
    name: 'Giveaways',
    icon: 'Giveaways',
    commands: [
      { name: 'giveaway', description: 'Create a new giveaway', permissions: ['Manage Guild'] },
      { name: 'giveawayend', description: 'End a giveaway early', permissions: ['Manage Guild'] },
      { name: 'giveawayreroll', description: 'Reroll a giveaway winner', permissions: ['Manage Guild'] },
      { name: 'giveawaylist', description: 'List all active giveaways', permissions: ['Everyone'] },
    ],
  },
  {
    name: 'Events',
    icon: 'Calendar',
    commands: [
      { name: 'event', description: 'Create a new event', permissions: ['Manage Events'] },
      { name: 'eventend', description: 'End an event early', permissions: ['Manage Events'] },
      { name: 'eventlist', description: 'List all upcoming events', permissions: ['Everyone'] },
      { name: 'eventjoin', description: 'Join an event', permissions: ['Everyone'] },
      { name: 'eventleave', description: 'Leave an event', permissions: ['Everyone'] },
    ],
  },
  {
    name: 'Polls',
    icon: 'Polls',
    commands: [
      { name: 'poll', description: 'Create a new poll', permissions: ['Manage Guild'] },
      { name: 'pollend', description: 'End a poll early', permissions: ['Manage Guild'] },
      { name: 'pollresults', description: 'View poll results', permissions: ['Everyone'] },
    ],
  },
  {
    name: 'Reminders',
    icon: 'Bell',
    commands: [
      { name: 'reminder', description: 'Set a reminder', permissions: ['Everyone'] },
      { name: 'reminders', description: 'View your active reminders', permissions: ['Everyone'] },
      { name: 'reminderdelete', description: 'Delete a reminder', permissions: ['Everyone'] },
    ],
  },
  {
    name: 'Analytics',
    icon: 'Analytics',
    commands: [
      { name: 'stats', description: 'View server statistics', permissions: ['View Audit Log'] },
      { name: 'messages', description: 'View message statistics', permissions: ['View Audit Log'] },
      { name: 'activity', description: 'View member activity', permissions: ['View Audit Log'] },
    ],
  },
];

export function CommandsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const query = search.toLowerCase();
    return COMMANDS_DATA.filter((cat) => {
      if (selectedCategory && cat.name !== selectedCategory) return false;
      if (!query) return true;
      return (
        cat.name.toLowerCase().includes(query) ||
        cat.commands.some(
          (cmd) =>
            cmd.name.toLowerCase().includes(query) ||
            cmd.description.toLowerCase().includes(query)
        )
      );
    });
  }, [search, selectedCategory]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Commands" description="Browse all bot commands by category" icon="Bot" />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-eltron-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={classNames(
              'px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
              !selectedCategory
                ? 'bg-eltron-accent text-white'
                : 'bg-eltron-elevated text-eltron-muted hover:text-eltron-text'
            )}
          >
            All
          </button>
          {COMMANDS_DATA.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
              className={classNames(
                'px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                selectedCategory === cat.name
                  ? 'bg-eltron-accent text-white'
                  : 'bg-eltron-elevated text-eltron-muted hover:text-eltron-text'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {filteredCategories.map((category) => (
          <div key={category.name} className="card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-eltron-border bg-eltron-elevated">
              <Icon name={category.icon} size={20} className="text-eltron-accent" />
              <h3 className="text-lg font-semibold text-eltron-text">{category.name}</h3>
              <span className="ml-auto text-sm text-eltron-muted">{category.commands.length} commands</span>
            </div>
            <div className="divide-y divide-eltron-border">
              {category.commands.map((cmd) => (
                <div key={cmd.name} className="px-6 py-4 hover:bg-eltron-elevated transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-semibold text-eltron-accent font-mono">/{cmd.name}</code>
                      </div>
                      <p className="text-sm text-eltron-muted mt-1">{cmd.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cmd.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 text-2xs font-medium rounded-full bg-eltron-elevated text-eltron-subtle"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Search" size={32} className="mx-auto text-eltron-subtle mb-3" />
          <p className="text-sm text-eltron-muted">No commands found matching your search.</p>
        </div>
      )}
    </div>
  );
}
