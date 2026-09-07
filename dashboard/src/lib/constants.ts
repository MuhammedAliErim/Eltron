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
  { label: 'Analytics', href: '/analytics', icon: 'Analytics', section: 'OVERVIEW' },
  { label: 'Moderation', href: '/moderation', icon: 'Moderation', section: 'MANAGEMENT' },
  { label: 'AutoMod', href: '/automod', icon: 'Bot', section: 'MANAGEMENT' },
  { label: 'Security', href: '/security', icon: 'Security', section: 'MANAGEMENT' },
  { label: 'Tickets', href: '/tickets', icon: 'Tickets', section: 'MANAGEMENT' },
  { label: 'Applications', href: '/applications', icon: 'Applications', section: 'MANAGEMENT' },
  { label: 'Staff', href: '/staff', icon: 'Members', section: 'MANAGEMENT' },
  { label: 'Welcome', href: '/welcome', icon: 'Star', section: 'COMMUNITY' },
  { label: 'Roles', href: '/roles', icon: 'Moderation', section: 'COMMUNITY' },
  { label: 'Leveling', href: '/leveling', icon: 'Levels', section: 'COMMUNITY' },
  { label: 'Giveaways', href: '/giveaways', icon: 'Giveaways', section: 'ENGAGEMENT' },
  { label: 'Events', href: '/events', icon: 'Calendar', section: 'ENGAGEMENT' },
  { label: 'Polls', href: '/polls', icon: 'Analytics', section: 'ENGAGEMENT' },
  { label: 'Reminders', href: '/reminders', icon: 'Bell', section: 'ENGAGEMENT' },
  { label: 'Settings', href: '/settings', icon: 'Settings', section: 'SYSTEM' },
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
  analytics: 'Analytics',
  moderation: 'Moderation',
  automod: 'AutoMod',
  security: 'Security',
  tickets: 'Tickets',
  applications: 'Applications',
  staff: 'Staff',
  welcome: 'Welcome',
  roles: 'Roles',
  leveling: 'Leveling',
  giveaways: 'Giveaways',
  events: 'Events',
  polls: 'Polls',
  reminders: 'Reminders',
  settings: 'Settings',
  overview: 'Overview',
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
