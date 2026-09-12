import { IconName } from './icons';

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  badge?: number;
  disabled?: boolean;
  section?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'Dashboard', section: 'OVERVIEW' },
  { label: 'Server Overview', href: '/overview', icon: 'Members', section: 'OVERVIEW' },
  { label: 'Analytics', href: '/analytics', icon: 'Analytics', section: 'OVERVIEW' },
  { label: 'Commands', href: '/commands', icon: 'Bot', section: 'OVERVIEW' },
  { label: 'Moderation', href: '/moderation', icon: 'Moderation', section: 'MANAGEMENT' },
  { label: 'Message Logs', href: '/message-logs', icon: 'Message', section: 'MANAGEMENT' },
  { label: 'Lockdowns', href: '/lockdowns', icon: 'Security', section: 'MANAGEMENT' },
  { label: 'Ban Appeals', href: '/ban-appeals', icon: 'Shield', section: 'MANAGEMENT' },
  { label: 'Starboard', href: '/starboard', icon: 'Star', section: 'COMMUNITY' },
  { label: 'AutoMod', href: '/automod', icon: 'Bot', section: 'MANAGEMENT' },
  { label: 'Security', href: '/security', icon: 'Security', section: 'MANAGEMENT' },
  { label: 'Tickets', href: '/tickets', icon: 'Tickets', section: 'MANAGEMENT' },
  { label: 'Applications', href: '/applications', icon: 'Applications', section: 'MANAGEMENT' },
  { label: 'Staff', href: '/staff', icon: 'Members', section: 'MANAGEMENT' },
  { label: 'Welcome', href: '/welcome', icon: 'Star', section: 'COMMUNITY' },
  { label: 'Roles', href: '/roles', icon: 'Moderation', section: 'COMMUNITY' },
  { label: 'Leveling', href: '/leveling', icon: 'Levels', section: 'COMMUNITY' },
  { label: 'Leveling Config', href: '/leveling-config', icon: 'Settings', section: 'COMMUNITY' },
  { label: 'Giveaways', href: '/giveaways', icon: 'Giveaways', section: 'ENGAGEMENT' },
  { label: 'Events', href: '/events', icon: 'Calendar', section: 'ENGAGEMENT' },
  { label: 'Polls', href: '/polls', icon: 'Analytics', section: 'ENGAGEMENT' },
  { label: 'Reminders', href: '/reminders', icon: 'Bell', section: 'ENGAGEMENT' },
  { label: 'Audit Logs', href: '/audit-logs', icon: 'Activity', section: 'MANAGEMENT' },
  { label: 'Auto-Responses', href: '/auto-responses', icon: 'Message', section: 'COMMUNITY' },
  { label: 'Tags', href: '/tags', icon: 'Copy', section: 'COMMUNITY' },
  { label: 'Custom Commands', href: '/custom-commands', icon: 'Bot', section: 'COMMUNITY' },
  { label: 'Counting', href: '/counting', icon: 'Analytics', section: 'ENGAGEMENT' },
  { label: 'Stats Channels', href: '/stats-channels', icon: 'Analytics', section: 'MANAGEMENT' },
  { label: 'Settings', href: '/settings', icon: 'Settings', section: 'SYSTEM' },
  { label: 'Bot Status', href: '/bot-status', icon: 'Activity', section: 'SYSTEM' },
  { label: 'Emoji Stats', href: '/emoji-stats', icon: 'Analytics', section: 'SYSTEM' },
  { label: 'Template', href: '/template', icon: 'Copy', section: 'SYSTEM' },
];

export const NAV_SECTIONS = ['OVERVIEW', 'MANAGEMENT', 'COMMUNITY', 'ENGAGEMENT', 'SYSTEM'] as const;

export const SECTION_LABELS: Record<string, string> = {
  OVERVIEW: 'Overview',
  MANAGEMENT: 'Management',
  COMMUNITY: 'Community',
  ENGAGEMENT: 'Engagement',
  SYSTEM: 'System',
};

export const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  overview: 'Server Overview',
  commands: 'Commands',
  analytics: 'Analytics',
  moderation: 'Moderation',
  'message-logs': 'Message Logs',
  lockdowns: 'Lockdowns',
  'ban-appeals': 'Ban Appeals',
  starboard: 'Starboard',
  automod: 'AutoMod',
  security: 'Security',
  tickets: 'Tickets',
  applications: 'Applications',
  staff: 'Staff',
  welcome: 'Welcome',
  roles: 'Roles',
  leveling: 'Leveling',
  'leveling-config': 'Leveling Config',
  giveaways: 'Giveaways',
  events: 'Events',
  polls: 'Polls',
  reminders: 'Reminders',
  'audit-logs': 'Audit Logs',
  'auto-responses': 'Auto-Responses',
  tags: 'Tags',
  'custom-commands': 'Custom Commands',
  counting: 'Counting',
  'stats-channels': 'Stats Channels',
  settings: 'Settings',
  'bot-status': 'Bot Status',
  'emoji-stats': 'Emoji Stats',
  template: 'Template',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  range: 'Custom Range',
};

export const MODERATION_TYPES = [
  { label: 'Warn', value: 'WARN' },
  { label: 'Timeout', value: 'TIMEOUT' },
  { label: 'Kick', value: 'KICK' },
  { label: 'Ban', value: 'BAN' },
  { label: 'Unban', value: 'UNBAN' },
  { label: 'Mute', value: 'MUTE' },
];

export const TICKET_STATUSES = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Claimed', value: 'CLAIMED' },
  { label: 'Closed', value: 'CLOSED' },
];

export const APPLICATION_STATUSES = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export const APPLICATION_TYPES = [
  { label: 'Staff', value: 'staff' },
  { label: 'Role', value: 'role' },
];

export const GIVEAWAY_STATUSES = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Ended', value: 'ENDED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export const EVENT_STATUSES = [
  { label: 'Upcoming', value: 'UPCOMING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Ended', value: 'ENDED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export const POLL_STATUSES = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Ended', value: 'ENDED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export const AUDIT_LOG_ACTIONS = [
  { label: 'Warn', value: 'WARN' },
  { label: 'Timeout', value: 'TIMEOUT' },
  { label: 'Kick', value: 'KICK' },
  { label: 'Ban', value: 'BAN' },
  { label: 'Unban', value: 'UNBAN' },
  { label: 'Mute', value: 'MUTE' },
  { label: 'AutoMod', value: 'AUTOMOD' },
  { label: 'Role Update', value: 'ROLE_UPDATE' },
  { label: 'Channel Update', value: 'CHANNEL_UPDATE' },
  { label: 'Message Delete', value: 'MESSAGE_DELETE' },
];

export const AUTO_RESPONSE_MATCH_TYPES = [
  { label: 'Exact', value: 'EXACT' },
  { label: 'Contains', value: 'CONTAINS' },
  { label: 'Starts With', value: 'STARTS_WITH' },
  { label: 'Regex', value: 'REGEX' },
];

export const REMINDER_STATUSES = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Triggered', value: 'TRIGGERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export const ANALYTICS_PERIODS = [
  { label: '7D', value: 'weekly', days: 7 },
  { label: '30D', value: 'monthly', days: 30 },
  { label: '90D', value: 'quarterly', days: 90 },
] as const;

export const TOAST_DURATION = 4000;

export const SIDEBAR_WIDTH = 256;
export const SIDEBAR_COLLAPSED_WIDTH = 64;
