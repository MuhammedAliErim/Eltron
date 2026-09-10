export interface GuildRow {
  id: number;
  guild_id: string;
  name: string;
  owner_id: string;
  language: string;
  timezone: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ModerationCaseRow {
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
  revoked_reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ModerationCaseCreate {
  guild_id: string;
  user_id: string;
  moderator_id: string;
  type: string;
  reason: string;
  duration?: number;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

export interface ModerationCaseRevoke {
  revoked_by: string;
  revoked_reason: string;
  type?: string;
}

export type ModerationAction = 'BAN' | 'UNBAN' | 'KICK' | 'TIMEOUT' | 'UNTIMEOUT' | 'WARN' | 'UNWARN';

export type AutomodTriggerType =
  | 'BANNED_WORD'
  | 'DISCORD_INVITE'
  | 'URL'
  | 'IP_ADDRESS'
  | 'MENTION_SPAM'
  | 'CAPS_SPAM'
  | 'FLOOD'
  | 'DUPLICATE_MESSAGE'
  | 'EMOJI_SPAM'
  | 'STICKER_SPAM';

export type AutomodActionType = 'DELETE' | 'WARN' | 'TIMEOUT' | 'KICK' | 'BAN';

export interface GuildAutomodConfigRow {
  id: number;
  guild_id: string;
  enabled: boolean;
  default_action: AutomodActionType;
  bypass_roles: string[];
  bypass_channels: string[];
  bypass_users: string[];
  flood_message_count: number;
  flood_window_seconds: number;
  duplicate_message_limit: number;
  duplicate_window_seconds: number;
  mention_limit: number;
  emoji_limit: number;
  sticker_limit: number;
  caps_threshold: number;
  caps_min_length: number;
  banned_words: string[];
  blocked_domains: string[];
  blocked_invites: boolean;
  log_channel_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuildAutomodConfigCreate {
  guild_id: string;
}

export interface GuildAutomodConfigUpdate {
  enabled?: boolean;
  default_action?: AutomodActionType;
  bypass_roles?: string[];
  bypass_channels?: string[];
  bypass_users?: string[];
  flood_message_count?: number;
  flood_window_seconds?: number;
  duplicate_message_limit?: number;
  duplicate_window_seconds?: number;
  mention_limit?: number;
  emoji_limit?: number;
  sticker_limit?: number;
  caps_threshold?: number;
  caps_min_length?: number;
  banned_words?: string[];
  blocked_domains?: string[];
  blocked_invites?: boolean;
  log_channel_id?: string | null;
}

export interface AutomodRuleRow {
  id: number;
  guild_id: string;
  name: string;
  enabled: boolean;
  trigger_type: AutomodTriggerType;
  trigger_value: string;
  action_type: AutomodActionType;
  action_value: string;
  created_at: string;
  updated_at: string;
}

export interface AutomodRuleCreate {
  guild_id: string;
  name: string;
  trigger_type: AutomodTriggerType;
  trigger_value: string;
  action_type: AutomodActionType;
  action_value?: string;
}

export interface AutomodViolation {
  triggerType: AutomodTriggerType;
  actionType: AutomodActionType;
  reason: string;
  shouldDelete: boolean;
  shouldPunish: boolean;
}

export interface AntiSpamState {
  messageTimestamps: number[];
  duplicateMessages: Map<string, number>;
  violationCount: number;
  lastViolation: number;
  lastAction: number;
}

export interface AntiSpamWindow {
  timestamps: number[];
  contents: string[];
}

export type AntiRaidAction = 'NONE' | 'WARN' | 'TIMEOUT' | 'KICK' | 'BAN';

export type RaidState = 'NORMAL' | 'SUSPECTED' | 'RAID';

export interface GuildAntiRaidConfigRow {
  id: number;
  guild_id: string;
  enabled: boolean;
  join_rate_limit: number;
  join_rate_window_seconds: number;
  account_age_threshold_days: number;
  burst_threshold: number;
  burst_window_seconds: number;
  raid_action: AntiRaidAction;
  auto_lockdown: boolean;
  lockdown_duration_seconds: number;
  bypass_roles: string[];
  bypass_users: string[];
  log_channel_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuildAntiRaidConfigUpdate {
  enabled?: boolean;
  join_rate_limit?: number;
  join_rate_window_seconds?: number;
  account_age_threshold_days?: number;
  burst_threshold?: number;
  burst_window_seconds?: number;
  raid_action?: AntiRaidAction;
  auto_lockdown?: boolean;
  lockdown_duration_seconds?: number;
  bypass_roles?: string[];
  bypass_users?: string[];
  log_channel_id?: string | null;
}

export type RiskSignal =
  | 'very_new_account'
  | 'suspicious_join'
  | 'join_burst'
  | 'raid_detected'
  | 'flood_detected'
  | 'duplicate_message'
  | 'mention_spam'
  | 'caps_spam'
  | 'banned_word'
  | 'discord_invite'
  | 'suspicious_url'
  | 'repeated_violations'
  | 'moderation_history';

export type RiskLevel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export type VerificationState = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';

export type VerificationMethod = 'button' | 'command' | 'role';

export interface GuildVerificationConfigRow {
  id: number;
  guild_id: string;
  enabled: boolean;
  verified_role_id: string | null;
  unverified_role_id: string | null;
  verification_timeout_seconds: number;
  max_attempts: number;
  rate_limit_window_seconds: number;
  rate_limit_max_attempts: number;
  log_channel_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuildVerificationConfigUpdate {
  enabled?: boolean;
  verified_role_id?: string | null;
  unverified_role_id?: string | null;
  verification_timeout_seconds?: number;
  max_attempts?: number;
  rate_limit_window_seconds?: number;
  rate_limit_max_attempts?: number;
  log_channel_id?: string | null;
}

export type QuarantineAction = 'QUARANTINE' | 'RELEASE';

export interface GuildQuarantineConfigRow {
  id: number;
  guild_id: string;
  enabled: boolean;
  quarantine_role_id: string | null;
  auto_quarantine_on_risk: boolean;
  auto_quarantine_risk_level: RiskLevel;
  quarantine_duration_seconds: number;
  max_quarantine_duration_seconds: number;
  log_channel_id: string | null;
  bypass_roles: string[];
  bypass_users: string[];
  created_at: string;
  updated_at: string;
}

export interface GuildQuarantineConfigUpdate {
  enabled?: boolean;
  quarantine_role_id?: string | null;
  auto_quarantine_on_risk?: boolean;
  auto_quarantine_risk_level?: RiskLevel;
  quarantine_duration_seconds?: number;
  max_quarantine_duration_seconds?: number;
  log_channel_id?: string | null;
  bypass_roles?: string[];
  bypass_users?: string[];
}

export interface QuarantineLogRow {
  id: number;
  guild_id: string;
  user_id: string;
  action: QuarantineAction;
  reason: string | null;
  performed_by: string | null;
  duration_seconds: number | null;
  released_at: string | null;
  created_at: string;
}

export interface GuildChannelWarningConfigRow {
  id: number;
  guild_id: string;
  enabled: boolean;
  auto_warning_on_spam: boolean;
  slowmode_escalation_steps: number[];
  violation_threshold: number;
  escalation_window_seconds: number;
  deescalation_delay_seconds: number;
  max_slowmode_seconds: number;
  bypass_roles: string[];
  bypass_users: string[];
  log_channel_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuildChannelWarningConfigUpdate {
  enabled?: boolean;
  auto_warning_on_spam?: boolean;
  slowmode_escalation_steps?: number[];
  violation_threshold?: number;
  escalation_window_seconds?: number;
  deescalation_delay_seconds?: number;
  max_slowmode_seconds?: number;
  bypass_roles?: string[];
  bypass_users?: string[];
  log_channel_id?: string | null;
}

export type TicketStatus = 'OPEN' | 'CLAIMED' | 'CLOSED';

export type TicketCategory = 'general' | 'support' | 'report' | 'other';

export interface TicketRow {
  id: number;
  guild_id: string;
  channel_id: string;
  creator_id: string;
  assigned_to: string | null;
  status: TicketStatus;
  category: TicketCategory;
  subject: string;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketCreate {
  guild_id: string;
  channel_id: string;
  creator_id: string;
  category?: TicketCategory;
  subject?: string;
}

export interface TicketUpdate {
  status?: TicketStatus;
  assigned_to?: string | null;
  subject?: string;
  closed_at?: string | null;
  closed_by?: string | null;
}

export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export type ApplicationType = 'STAFF' | 'FAMILY' | 'PARTNERSHIP' | 'OTHER';

export type QuestionType = 'SHORT_TEXT' | 'LONG_TEXT' | 'NUMBER' | 'BOOLEAN';

export interface ApplicationRow {
  id: number;
  guild_id: string;
  applicant_id: string;
  type: ApplicationType;
  status: ApplicationStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationCreate {
  guild_id: string;
  applicant_id: string;
  type: ApplicationType;
}

export interface ApplicationUpdate {
  status?: ApplicationStatus;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_reason?: string | null;
}

export interface ApplicationAnswerRow {
  id: number;
  application_id: number;
  question_id: string;
  answer: string;
  created_at: string;
}

export interface ApplicationAnswerCreate {
  application_id: number;
  question_id: string;
  answer: string;
}

export interface ApplicationQuestion {
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  maxLength: number;
  order: number;
}

export type StaffRole = 'STAFF' | 'SENIOR_STAFF' | 'MANAGER';

export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface StaffMemberRow {
  id: number;
  guild_id: string;
  user_id: string;
  staff_role: StaffRole;
  status: StaffStatus;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffMemberCreate {
  guild_id: string;
  user_id: string;
  staff_role?: StaffRole;
  added_by?: string;
}

export interface StaffMemberUpdate {
  staff_role?: StaffRole;
  status?: StaffStatus;
}

export interface WelcomeConfigRow {
  guild_id: string;
  welcome_enabled: boolean;
  welcome_channel_id: string | null;
  welcome_message: string;
  welcome_use_embed: boolean;
  welcome_embed_title: string;
  welcome_embed_description: string;
  welcome_embed_color: string;
  goodbye_enabled: boolean;
  goodbye_channel_id: string | null;
  goodbye_message: string;
  goodbye_use_embed: boolean;
  goodbye_embed_title: string;
  goodbye_embed_description: string;
  goodbye_embed_color: string;
  created_at: string;
  updated_at: string;
}

export interface WelcomeConfigUpdate {
  welcome_enabled?: boolean;
  welcome_channel_id?: string | null;
  welcome_message?: string;
  welcome_use_embed?: boolean;
  welcome_embed_title?: string;
  welcome_embed_description?: string;
  welcome_embed_color?: string;
  goodbye_enabled?: boolean;
  goodbye_channel_id?: string | null;
  goodbye_message?: string;
  goodbye_use_embed?: boolean;
  goodbye_embed_title?: string;
  goodbye_embed_description?: string;
  goodbye_embed_color?: string;
}

export interface AutoRoleConfigRow {
  guild_id: string;
  role_id: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutoRoleConfigUpdate {
  role_id?: string | null;
  enabled?: boolean;
}

export interface UserXPRow {
  id: number;
  guild_id: string;
  user_id: string;
  xp: number;
  level: number;
  total_messages: number;
  last_xp_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserXPCreate {
  guild_id: string;
  user_id: string;
  xp?: number;
  level?: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  xp: number;
  level: number;
}

export type GiveawayStatus = 'ACTIVE' | 'ENDED' | 'CANCELLED';

export interface GiveawayRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  host_id: string;
  prize: string;
  description: string;
  winner_count: number;
  ends_at: string;
  status: GiveawayStatus;
  created_at: string;
  updated_at: string;
}

export interface GiveawayCreate {
  guild_id: string;
  channel_id: string;
  message_id?: string;
  host_id: string;
  prize: string;
  description?: string;
  winner_count: number;
  ends_at: string;
}

export interface GiveawayUpdate {
  message_id?: string | null;
  status?: GiveawayStatus;
}

export interface GiveawayEntryRow {
  id: number;
  giveaway_id: number;
  guild_id: string;
  user_id: string;
  joined_at: string;
}

export interface GiveawayEntryCreate {
  giveaway_id: number;
  guild_id: string;
  user_id: string;
}

export interface GiveawayWinnerRow {
  id: number;
  giveaway_id: number;
  guild_id: string;
  user_id: string;
  reroll_number: number;
  selected_at: string;
}

export interface GiveawayWinnerCreate {
  giveaway_id: number;
  guild_id: string;
  user_id: string;
  reroll_number?: number;
}

export type EventStatus = 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';

export type EventType = 'GENERAL' | 'COMPETITION' | 'TOURNAMENT' | 'MEETING' | 'OTHER';

export interface EventRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  creator_id: string;
  title: string;
  description: string;
  event_type: EventType;
  status: EventStatus;
  starts_at: string;
  ends_at: string | null;
  max_participants: number | null;
  created_at: string;
  updated_at: string;
}

export interface EventCreate {
  guild_id: string;
  channel_id: string;
  message_id?: string;
  creator_id: string;
  title: string;
  description?: string;
  event_type: EventType;
  starts_at: string;
  ends_at?: string;
  max_participants?: number;
}

export interface EventUpdate {
  message_id?: string | null;
  status?: EventStatus;
  ends_at?: string | null;
}

export interface EventParticipantRow {
  id: number;
  event_id: number;
  guild_id: string;
  user_id: string;
  joined_at: string;
}

export interface EventParticipantCreate {
  event_id: number;
  guild_id: string;
  user_id: string;
}

export interface EventWinnerRow {
  id: number;
  event_id: number;
  guild_id: string;
  user_id: string;
  selected_at: string;
}

export interface EventWinnerCreate {
  event_id: number;
  guild_id: string;
  user_id: string;
}

export type PollStatus = 'ACTIVE' | 'ENDED' | 'CANCELLED';

export interface PollRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  creator_id: string;
  question: string;
  description: string;
  status: PollStatus;
  multiple_choice: boolean;
  anonymous: boolean;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PollCreate {
  guild_id: string;
  channel_id: string;
  message_id?: string;
  creator_id: string;
  question: string;
  description?: string;
  multiple_choice?: boolean;
  anonymous?: boolean;
  ends_at?: string;
}

export interface PollUpdate {
  message_id?: string | null;
  status?: PollStatus;
}

export interface PollOptionRow {
  id: number;
  poll_id: number;
  guild_id: string;
  option_index: number;
  option_text: string;
  created_at: string;
}

export interface PollOptionCreate {
  poll_id: number;
  guild_id: string;
  option_index: number;
  option_text: string;
}

export interface PollVoteRow {
  id: number;
  poll_id: number;
  option_id: number;
  guild_id: string;
  user_id: string;
  voted_at: string;
}

export interface PollVoteCreate {
  poll_id: number;
  option_id: number;
  guild_id: string;
  user_id: string;
}

export interface PollResult {
  option: PollOptionRow;
  voteCount: number;
  percentage: number;
  voters: string[];
}

export type ReminderStatus = 'PENDING' | 'TRIGGERED' | 'CANCELLED';

export interface ReminderRow {
  id: number;
  guild_id: string;
  user_id: string;
  channel_id: string;
  message: string;
  remind_at: string;
  status: ReminderStatus;
  created_at: string;
  updated_at: string;
}

export interface ReminderCreate {
  guild_id: string;
  user_id: string;
  channel_id: string;
  message: string;
  remind_at: string;
}

export interface ReminderUpdate {
  status?: ReminderStatus;
}

export interface AnalyticsDailyRow {
  id: number;
  guild_id: string;
  date: string;
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
  created_at: string;
  updated_at: string;
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

export interface ReactionRoleRow {
  id: string;
  guild_id: string;
  channel_id: string;
  message_id: string;
  title: string;
  description: string | null;
  color: string;
  emoji: string;
  role_id: string;
  max_uses: number;
  current_uses: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReactionRoleCreate {
  guild_id: string;
  channel_id: string;
  message_id: string;
  title: string;
  description?: string;
  color?: string;
  emoji: string;
  role_id: string;
  created_by: string;
}

export interface ReactionRoleUpdate {
  title?: string;
  description?: string;
  color?: string;
  max_uses?: number;
  current_uses?: number;
}
