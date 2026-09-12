export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
}

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  hasBot: boolean;
}

export interface GuildDetail extends Guild {
  settings: {
    language: string;
    timezone: string;
    settings: Record<string, unknown>;
  } | null;
}

export interface AnalyticsSummary {
  guild_id: string;
  from_date: string;
  to_date: string;
  messages_total: number;
  messages_deleted: number;
  members_joined: number;
  members_left: number;
  moderation_actions: number;
  warnings: number;
  timeouts: number;
  kicks: number;
  bans: number;
  automod_actions: number;
  spam_detections: number;
  raid_detections: number;
  verification_events: number;
  quarantine_events: number;
  tickets_created: number;
  tickets_closed: number;
  applications_submitted: number;
  applications_approved: number;
  applications_rejected: number;
  giveaways_created: number;
  giveaway_entries: number;
  events_created: number;
  event_participants: number;
  polls_created: number;
  poll_votes: number;
  reminders_created: number;
  xp_awarded: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code: string;
  errorId?: string;
  details?: string[];
}

export interface ModerationCase {
  id: number;
  case_id: number;
  guild_id: string;
  user_id: string;
  moderator_id: string;
  type: string;
  reason: string;
  duration: number | null;
  expires_at: string | null;
  active: boolean;
  revoked_by: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AutoModConfig {
  guild_id: string;
  enabled: boolean;
  max_mentions: number;
  max_links: number;
  max_invites: number;
  max_emojis: number;
  max_words: number;
  anti_mass_mention_enabled: boolean;
  anti_mass_mention_threshold: number;
  link_filter_enabled: boolean;
  blocked_links: string[];
  invite_filter_enabled: boolean;
  spam_protection_enabled: boolean;
  spam_time_window: number;
  spam_message_limit: number;
}

export interface AutoModRule {
  id: number;
  guild_id: string;
  name: string;
  enabled: boolean;
  trigger_type: string;
  action_type: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AntiRaidConfig {
  guild_id: string;
  enabled: boolean;
  detection_enabled: boolean;
  max_joins_per_minute: number;
  max_joins_per_5_minutes: number;
  action: string;
  alert_channel_id: string | null;
  exempt_roles: string[];
  exempt_users: string[];
}

export interface QuarantineConfig {
  guild_id: string;
  enabled: boolean;
  default_duration: number;
  role_id: string | null;
  auto_release: boolean;
  release_role_id: string | null;
  log_channel_id: string | null;
}

export interface QuarantineLog {
  id: number;
  guild_id: string;
  user_id: string;
  action: string;
  reason: string | null;
  performed_by: string | null;
  duration_seconds: number | null;
  released: boolean;
  released_by: string | null;
  released_at: string | null;
  created_at: string;
}

export interface VerificationConfig {
  guild_id: string;
  enabled: boolean;
  method: string;
  role_id: string | null;
  log_channel_id: string | null;
  welcome_message: string | null;
  verification_channel_id: string | null;
  questions: string[];
  timeout_minutes: number;
}

export interface ChannelWarningConfig {
  guild_id: string;
  enabled: boolean;
  max_slowmode: number;
  slowmode_increment: number;
  alert_threshold: number;
  exempt_roles: string[];
  exempt_channels: string[];
  log_channel_id: string | null;
}

export interface Ticket {
  id: number;
  guild_id: string;
  channel_id: string;
  creator_id: string;
  assigned_to: string | null;
  status: string;
  category: string;
  subject: string;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: number;
  guild_id: string;
  applicant_id: string;
  type: string;
  status: string;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationAnswer {
  id: number;
  application_id: number;
  question: string;
  answer: string;
  created_at: string;
}

export interface StaffMember {
  user_id: string;
  staff_role: string;
  status: string;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export interface WelcomeConfig {
  guild_id: string;
  enabled: boolean;
  channel_id: string | null;
  welcome_message: string | null;
  dm_message: string | null;
  auto_role_id: string | null;
  embed_enabled: boolean;
  embed_color: string | null;
  embed_title: string | null;
  embed_description: string | null;
  embed_thumbnail: boolean;
  goodbye_enabled: boolean;
  goodbye_channel_id: string | null;
  goodbye_message: string | null;
  goodbye_embed_enabled: boolean;
}

export interface AutoRoleConfig {
  guild_id: string;
  enabled: boolean;
  role_id: string | null;
}

export interface LevelingConfig {
  enabled: boolean;
  xpPerMessage: number;
  cooldownSeconds: number;
  levelUpMessage: string;
  levelUpChannel: string | null;
  levelUpEmbed: boolean;
  xpMultiplier: number;
  roleRewards: Record<string, string>;
}

export interface LevelRoleReward {
  id: string;
  guild_id: string;
  level: number;
  role_id: string;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  xp: number;
  level: number;
  message_count: number;
  rank?: number;
}

export interface UserXP {
  user_id: string;
  guild_id: string;
  xp: number;
  level: number;
  message_count: number;
  last_xp_at: string;
  rank?: number;
}

export interface Giveaway {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string;
  creator_id: string;
  prize: string;
  description: string | null;
  winner_count: number;
  status: string;
  ends_at: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface GiveawayEntry {
  id: number;
  giveaway_id: number;
  user_id: string;
  entered_at: string;
}

export interface GiveawayWinner {
  id: number;
  giveaway_id: number;
  user_id: string;
  selected_at: string;
}

export interface Event {
  id: number;
  guild_id: string;
  channel_id: string | null;
  creator_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  max_participants: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EventParticipant {
  id: number;
  event_id: number;
  user_id: string;
  joined_at: string;
}

export interface EventWinner {
  id: number;
  event_id: number;
  user_id: string;
  selected_at: string;
}

export interface Poll {
  id: number;
  guild_id: string;
  creator_id: string;
  question: string;
  description: string | null;
  anonymous: boolean;
  status: string;
  ends_at: string | null;
  created_at: string;
}

export interface PollOption {
  id: number;
  poll_id: number;
  guild_id: string;
  option_index: number;
  option_text: string;
  created_at: string;
}

export interface PollVote {
  id: number;
  poll_id: number;
  option_id: number;
  user_id: string;
  created_at: string;
}

export interface PollResult {
  option_id: number;
  text: string;
  vote_count: number;
}

export interface Reminder {
  id: number;
  guild_id: string;
  user_id: string;
  channel_id: string;
  message: string;
  remind_at: string;
  status: string;
  created_at: string;
}

export interface GuildSettings {
  guild_id: string;
  language: string;
  timezone: string;
  settings: Record<string, unknown>;
}

export interface AuditLog {
  id: number;
  guild_id: string;
  action: string;
  moderator_id: string;
  target_id: string | null;
  target_type: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogStats {
  total: number;
  by_action: Record<string, number>;
}

export interface AutoResponse {
  id: number;
  guild_id: string;
  trigger: string;
  response: string;
  match_type: string;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  guild_id: string;
  name: string;
  content: string;
  aliases: string[];
  use_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CustomCommand {
  id: number;
  guild_id: string;
  name: string;
  response: string;
  aliases: string[];
  embed_color: string | null;
  use_count: number;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CountingConfig {
  id: number;
  guild_id: string;
  channel_id: string | null;
  current_number: number;
  highest_number: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CountingScore {
  user_id: string;
  score: number;
  correct_count: number;
  wrong_count: number;
}

export interface StatsChannel {
  id: string;
  guild_id: string;
  channel_id: string;
  channel_name: string;
  type: string;
  format: string;
  last_updated: string;
  created_at: string;
}

export interface BotStatus {
  uptime: number;
  guilds: number;
  users: number;
  commands: number;
  memory: { used: number; total: number };
  ping: number;
  nodeVersion: string;
  discordJsVersion: string;
  gatewayStatus: string;
}

export interface EmojiInfo {
  name: string;
  id: string | null;
  animated: boolean;
  url: string;
}

export interface EmojiStats {
  total: number;
  animated: number;
  static: number;
  emojis: EmojiInfo[];
}

export interface ServerTemplate {
  guild_id: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface MessageLog {
  id: number;
  guild_id: string;
  channel_id: string;
  author_id: string;
  action: 'EDIT' | 'DELETE';
  old_content: string | null;
  new_content: string | null;
  message_id: string;
  created_at: string;
}

export interface Lockdown {
  id: number;
  guild_id: string;
  channel_id: string;
  locked_by: string;
  reason: string | null;
  duration_minutes: number | null;
  auto_unlock: boolean;
  unlocked_at: string | null;
  created_at: string;
}

export interface BanAppeal {
  id: number;
  guild_id: string;
  user_id: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  reviewer: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface StarboardConfig {
  guild_id: string;
  enabled: boolean;
  channel_id: string | null;
  threshold: number;
  emoji: string;
  self_star: boolean;
}

export interface StarboardEntry {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string;
  author_id: string;
  content: string;
  star_count: number;
  starboard_message_id: string | null;
  created_at: string;
}
