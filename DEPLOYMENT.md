# PHASE 5 — PRODUCTION DEPLOYMENT & E2E TEST GUIDE

> **CRITICAL: Never commit real secret values to this file or any repository.**

---

## 1. PRODUCTION ENVIRONMENT VARIABLES

### Required Variables (Server-Side)

| Variable | Description | Example Format | Required |
|----------|-------------|---------------|----------|
| `NODE_ENV` | Environment mode | `production` | YES |
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | `MTxxxxxxxxx.xxxxxx.xxxxxx` | YES |
| `DISCORD_CLIENT_ID` | Application client ID | `123456789012345678` | YES |
| `DISCORD_CLIENT_SECRET` | OAuth2 client secret | `xxxxxxxxxxxxxxxxxxxxxxxx` | YES (for dashboard) |
| `DISCORD_PUBLIC_KEY` | Interactions public key | `xxxxxxxxxxxxxxxxxxxxxxxx` | YES |
| `SUPABASE_URL` | Supabase project URL | `https://xxxx.supabase.co` | YES |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOi...` | YES |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (SECRET) | `eyJhbGciOi...` | YES |
| `SESSION_SECRET` | Express session secret (min 32 chars) | Random 64-char hex string | YES |
| `BOT_OWNERS` | Comma-separated Discord user IDs | `123456789,987654321` | Optional |
| `API_PORT` | Dashboard API server port | `3001` | Optional (default: 3001) |
| `DASHBOARD_URL` | Dashboard frontend URL | `https://dashboard.yourdomain.com` | YES |
| `CORS_ORIGIN` | Allowed CORS origin | `https://dashboard.yourdomain.com` | YES |

### Generating SESSION_SECRET

```bash
# Linux/Mac
openssl rand -hex 32

# PowerShell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
```

### .env.production Template

```env
NODE_ENV=production
DISCORD_TOKEN=REDACTED
DISCORD_CLIENT_ID=REDACTED
DISCORD_CLIENT_SECRET=REDACTED
DISCORD_PUBLIC_KEY=REDACTED
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=REDACTED
SUPABASE_SERVICE_ROLE_KEY=REDACTED
SESSION_SECRET=REDACTED_64_CHAR_HEX_STRING
BOT_OWNERS=YOUR_DISCORD_USER_ID

# ACLClouds / Pterodactyl: API_PORT must match your allocation port
API_PORT=YOUR_ALLOCATION_PORT
DASHBOARD_URL=http://YOUR_IP:YOUR_PORT
CORS_ORIGIN=http://YOUR_IP:YOUR_PORT
```

### ACLClouds Specific Notes
- `API_PORT` **must** match your Pterodactyl allocation port (e.g., `30413`)
- Express listens on `0.0.0.0` (all interfaces) by default
- The API server is externally accessible at `http://YOUR_IP:YOUR_ALLOCATION_PORT`
- No HTTPS by default — session cookies use `secure: false` and `sameSite: 'lax'`
- When you add a domain + HTTPS, set `DASHBOARD_URL` to `https://yourdomain.com` to enable secure cookies
- Discord OAuth2 redirect URI must be registered as `http://YOUR_IP:YOUR_PORT/api/auth/callback`

---

## 2. DISCORD DEVELOPER PORTAL SETUP

### 2.1 Bot Tab
- [ ] Bot token generated and saved (DO NOT SHARE)
- [ ] Bot username set
- [ ] Bot avatar uploaded
- [ ] **Privileged Gateway Intents** enabled:
  - [ ] `PRESENCE INTENT` — Required for member tracking
  - [ ] `SERVER MEMBERS INTENT` — Required for welcome/goodbye, auto-role, quarantine
  - [ ] `MESSAGE CONTENT INTENT` — Required for automod, anti-spam, leveling
- [ ] Bot permissions set to: `Administrator` (or specific permissions below)

### 2.2 OAuth2 Tab
- [ ] Client ID noted
- [ ] Client secret generated and saved
- [ ] **Redirect URLs** configured:
  - [ ] `https://dashboard.yourdomain.com/api/auth/callback` (production with HTTPS)
  - [ ] `http://YOUR_IP:YOUR_PORT/api/auth/callback` (ACLClouds / Pterodactyl)
  - [ ] `http://localhost:5173/api/auth/callback` (local development)
- [ ] **OAuth2 Scopes** authorized:
  - [ ] `identify` — Basic user info
  - [ ] `guilds` — List user's guilds
  - [ ] `bot` — Bot join guild (when user authorizes)

### 2.3 Bot Permissions (Minimum Required)
```
Administrator (0x8) — Recommended for full functionality
```

Or specific permissions:
```
MANAGE_GUILD (0x20) — Dashboard guild access
MANAGE_ROLES (0x10000000) — Auto-role, role management
MANAGE_CHANNELS (0x10) — Ticket channel creation
KICK_MEMBERS (0x2) — Moderation
BAN_MEMBERS (0x4) — Moderation
MANAGE_MESSAGES (0x2000) — AutoMod, message deletion
MODERATE_MEMBERS (0x40000000) — Timeout
SEND_MESSAGES (0x800) — All messaging
MANAGE_NICKNAMES (0x400000) — Staff system
VIEW_CHANNEL (0x400) — Required for channel access
```

### 2.4 Invite Bot to Server
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot
```

---

## 3. BOT PERMISSIONS & ROLE HIERARCHY

### Bot Role Requirements
- Bot must have a role **higher** than all roles it manages
- Bot role must be above quarantine role if quarantine is enabled
- Bot role must be above auto-assigned roles

### Role Hierarchy Checklist
- [ ] Bot's highest role > all managed roles
- [ ] Bot's highest role > quarantine role
- [ ] Bot's highest role > auto-role target
- [ ] Bot has `Manage Roles` permission
- [ ] Bot's role position is below Administrator roles but above target roles

### Permission Guards Active
- Moderation commands: `MANAGE_GUILD` or `ADMINISTRATOR`
- AutoMod config: `MANAGE_GUILD`
- Security config: `MANAGE_GUILD`
- Ticket management: `MANAGE_GUILD`
- Staff management: `MANAGE_GUILD` or bot owner
- Giveaway/Event/Poll creation: `MANAGE_GUILD`

---

## 4. SUPABASE MIGRATION STATUS

### Required Migrations (6 total)
Run in order:
```bash
npx tsx scripts/migrate.ts status
```

| # | Migration File | Purpose |
|---|---------------|---------|
| 1 | `20260905140000_giveaway_system_phase1.sql` | Giveaway tables |
| 2 | `20260905150000_event_system_phase1.sql` | Event tables |
| 3 | `20260905160000_poll_system_phase1.sql` | Poll tables |
| 4 | `20260906160000_reminder_system_phase1.sql` | Reminder table |
| 5 | `20260906170000_analytics_system_phase1.sql` | Analytics table |
| 6 | `20260907180000_critical_functions_and_indexes.sql` | RPC functions + indexes |

### Pre-Deployment Migration Steps
```bash
# Check migration status
npx tsx scripts/migrate.ts status

# List pending migrations
npx tsx scripts/migrate.ts pending

# Apply all pending migrations
npx tsx scripts/migrate.ts
```

### Core Tables (must exist from earlier setup)
- `guilds` — Guild configuration
- `moderation_cases` — Moderation history
- `automod_configs` — AutoMod settings
- `quarantine_logs` — Quarantine records
- `channel_warnings` — Channel warning tracking
- `verification_sessions` — Verification state
- `tickets` — Support tickets
- `applications` — Staff applications
- `staff_members` — Staff records
- `welcome_configs` — Welcome/goodbye settings
- `roles` — Auto-role config
- `user_xp` — Level/XP data

### RPC Functions Required
```sql
-- Must be created by migration 6:
get_next_case_number(p_guild_id TEXT) RETURNS BIGINT
increment_analytics_metric(p_guild_id TEXT, p_date DATE, p_metric TEXT, p_increment BIGINT) RETURNS VOID
update_updated_at_column() RETURNS TRIGGER
```

---

## 5. DASHBOARD PRODUCTION CONFIGURATION

### Frontend Build
```bash
cd dashboard
npm run build
# Output: dashboard/dist/
```

### Serving Options

#### Option A: Express serves static files (Recommended)
Add to `src/api/server.ts`:
```typescript
import path from 'path';
app.use(express.static(path.join(__dirname, '../../dashboard/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/dist/index.html'));
});
```

#### Option B: Nginx reverse proxy
```nginx
server {
    listen 443 ssl;
    server_name dashboard.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Dashboard frontend
    location / {
        root /path/to/dashboard/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Build Verification
```bash
# Check no secrets in bundle
grep -r "DISCORD_CLIENT_SECRET\|SUPABASE_SERVICE_ROLE\|SESSION_SECRET" dashboard/dist/
# Should return 0 results
```

---

## 6. CORS / OAuth2 / SESSION CONFIGURATION

### CORS
- `origin`: Must match `DASHBOARD_URL` exactly
- `credentials`: `true` (required for cookies)
- `methods`: `GET, POST, PUT`
- `allowedHeaders`: `Content-Type, Authorization`

### OAuth2 Flow
1. User clicks "Login" → redirected to `/api/auth/login`
2. Login generates CSRF `state`, stores in session, redirects to Discord OAuth2
3. Discord redirects to `/api/auth/callback?code=xxx&state=yyy`
4. Backend validates `state`, exchanges code for token
5. Backend fetches user info, stores in session
6. Redirects to `DASHBOARD_URL/dashboard`

### Session Configuration
- Cookie name: `eltron.sid`
- `httpOnly`: `true` (prevents XSS)
- `secure`: derived from HTTPS (`DASHBOARD_URL.startsWith('https://')`) — `false` for HTTP
- `sameSite`: `none` when `secure: true` (cross-origin), `lax` otherwise
- `maxAge`: 7 days
- No explicit `domain` — Express uses the request hostname by default

### Production Checklist
- [ ] HTTPS configured (required for `secure: true` cookies; optional for same-origin setups)
- [ ] CORS origin matches dashboard URL exactly (supports comma-separated for multiple origins)
- [ ] OAuth2 redirect URLs registered in Discord Developer Portal (must include `/api/auth/callback`)
- [ ] Session secret is 64-char random hex
- [ ] API_PORT matches your Pterodactyl allocation port

---

## 7. BOT STARTUP & GRACEFUL SHUTDOWN TEST

### Startup Sequence
```
1. Environment validated (Zod schema)
2. Database connected (Supabase with retry)
3. Cache cleanup started
4. Discord client created and started
5. Giveaway timers restored
6. Event timers restored
7. Poll timers restored
8. Reminder timers restored
9. API server started
10. Slash commands deployed
11. Bot online logged
```

### Shutdown Sequence (SIGTERM/SIGINT)
```
1. Cache cleanup stopped
2. API server closed
3. Discord client destroyed (cooldowns cleared, listeners removed)
4. Force exit timeout set (10s)
5. Process exit
```

### Test Commands
```bash
# Start bot
npm run start

# Test graceful shutdown
kill -SIGTERM <PID>

# Check logs for:
# "Received SIGTERM. Starting graceful shutdown..."
# "Eltron Bot is now offline"
```

---

## 8. DASHBOARD LOGIN/LOGOUT TEST

### Login Flow Test
1. [ ] Navigate to `https://dashboard.yourdomain.com`
2. [ ] Click "Login with Discord"
3. [ ] Discord OAuth2 consent screen appears
4. [ ] After approval, redirected to `/dashboard`
5. [ ] User info displayed (avatar, username)
6. [ ] Guild list populated with accessible servers

### Logout Flow Test
1. [ ] Click logout button in sidebar
2. [ ] Session destroyed
3. [ ] Redirected to `/login` or homepage
4. [ ] Cannot access `/dashboard` without re-login

### Session Persistence Test
1. [ ] Login successfully
2. [ ] Refresh page
3. [ ] Still logged in (session cookie persists)
4. [ ] Wait 7+ days
5. [ ] Session expires, must re-login

---

## 9. E2E TEST CHECKLIST

### Instructions
For each system, execute the test in a **real Discord server** with the bot present.
Mark ACTUAL RESULT and PASS/FAIL after each test.

---

### 9.1 MODERATION

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| M1 | `/warn @user Reason` | Warning case created, user notified | | |
| M2 | `/warnings @user` | List of warnings displayed | | |
| M3 | `/unwarn <case_id>` | Warning revoked | | |
| M4 | `/timeout @user 10m Reason` | User timed out for 10 minutes | | |
| M5 | `/untimeout @user` | Timeout removed | | |
| M6 | `/kick @user Reason` | User kicked from server | | |
| M7 | `/ban @user Reason` | User banned from server | | |
| M8 | `/unban <user_id>` | User unbanned | | |
| M9 | Dashboard: View moderation logs | Cases displayed with pagination | | |
| M10 | Dashboard: View case detail | Full case info shown | | |
| M11 | Moderation hierarchy: try to warn higher role | Permission denied | | |
| M12 | Moderation hierarchy: try to ban owner | Permission denied | | |

### 9.2 AUTOMOD

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| A1 | Dashboard: Toggle AutoMod enabled | Config saved | | |
| A2 | Send message with banned word | Message deleted, warning issued | | |
| A3 | Send message with Discord invite link | Invite link removed | | |
| A4 | Send message with blocked URL | Message deleted | | |
| A5 | Send excessive mentions (>5) | Message deleted, spam detected | | |
| A6 | Send ALL CAPS message (>80%) | Message deleted | | |
| A7 | Send flood of messages (5+ in 3s) | Flood detected, action taken | | |
| A8 | Send excessive emoji (>5) | Message deleted | | |
| A9 | Dashboard: View automod rules | Rules displayed | | |
| A10 | Bypass user sends banned word | Message allowed (not deleted) | | |
| A11 | Bypass channel sends banned word | Message allowed | | |

### 9.3 ANTI-SPAM

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| AS1 | Send 5+ identical messages rapidly | Spam detected, action taken | | |
| AS2 | Send same message 3 times in 10s | Duplicate detection triggered | | |
| AS3 | Normal conversation | No spam detected | | |
| AS4 | Bot messages ignored | No spam action on bot | | |

### 9.4 ANTI-RAID

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| AR1 | 10+ joins in 60 seconds | Raid detected, state → SUSPECTED | | |
| AR2 | 20+ joins in 30 seconds | Raid confirmed, state → RAID | | |
| AR3 | New account (<7 days) joins during raid | Account flagged | | |
| AR4 | Normal joins (1 every 5 min) | No raid detected | | |
| AR5 | Dashboard: View raid status | Current state displayed | | |

### 9.5 RISK SCORING

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| RS1 | New account join | Risk score increases | | |
| RS2 | Multiple guilds shared | Risk score increases | | |
| RS3 | Account with avatar + age > 30d | Low risk score | | |
| RS4 | Risk score > 80 | User quarantined automatically | | |
| RS5 | Risk score decays over time | Score decreases after 1hr | | |

### 9.6 VERIFICATION

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| V1 | New member joins (verification enabled) | Verification prompt sent | | |
| V2 | Click verify button | Verification completed, role assigned | | |
| V3 | Exceed max attempts | Verification locked | | |
| V4 | Bot/owner bypasses verification | No verification required | | |
| V5 | Dashboard: View verification config | Config displayed | | |

### 9.7 QUARANTINE

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| Q1 | Manually quarantine user `/quarantine @user` | User role replaced with quarantine role | | |
| Q2 | Quarantined user sends message | Message blocked/limited | | |
| Q3 | Release user `/unquarantine @user` | Original roles restored | | |
| Q4 | Auto-quarantine on high risk score | User automatically quarantined | | |
| Q5 | Quarantine with custom duration | Auto-release after duration | | |
| Q6 | Dashboard: View quarantine logs | Logs displayed | | |

### 9.8 CHANNEL WARNING

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| CW1 | First violation in channel | Warning recorded | | |
| CW2 | Reach threshold (e.g., 3 violations) | Channel locked/warned | | |
| CW3 | Violation in different channel | Separate tracking | | |
| CW4 | Violations reset after time window | Counter reset | | |

### 9.9 TICKETS

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| T1 | Create ticket via button/command | Ticket channel created | | |
| T2 | Staff claims ticket | Ticket status → CLAIMED | | |
| T3 | Close ticket | Ticket status → CLOSED, channel deleted | | |
| T4 | Reopen closed ticket | Ticket status → OPEN | | |
| T5 | Dashboard: View ticket list | Tickets displayed with pagination | | |
| T6 | Dashboard: View ticket detail | Full ticket info shown | | |

### 9.10 APPLICATIONS

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| AP1 | Submit application | Application created | | |
| AP2 | Dashboard: View applications | Applications listed | | |
| AP3 | Dashboard: View application detail | Answers displayed | | |
| AP4 | Withdraw own application | Status → WITHDRAWN | | |

### 9.11 STAFF

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| ST1 | Add staff member | Staff record created | | |
| ST2 | Promote staff | Role updated | | |
| ST3 | Demote staff | Role updated | | |
| ST4 | Remove staff | Record deactivated | | |
| ST5 | Dashboard: View staff list | Staff displayed | | |
| ST6 | Prevent self-management | Permission denied | | |

### 9.12 WELCOME / GOODBYE

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| W1 | New member joins (welcome enabled) | Welcome message sent | | |
| W2 | Member leaves (goodbye enabled) | Goodbye message sent | | |
| W3 | Welcome disabled | No message on join | | |
| W4 | Bot joins server (not welcome target) | No self-welcome | | |
| W5 | Dashboard: Toggle welcome on/off | Config saved | | |
| W6 | Dashboard: Preview message | Preview displayed | | |

### 9.13 ROLES / AUTOROLE

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| R1 | Auto-role enabled, new member joins | Role automatically assigned | | |
| R2 | Auto-role disabled | No role assigned | | |
| R3 | Dashboard: Enable auto-role | Config saved | | |
| R4 | `/role create` | Role created | | |
| R5 | `/role delete` | Role deleted | | |

### 9.14 LEVELING

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| L1 | Send messages, gain XP | XP increases | | |
| L2 | Reach XP threshold, level up | Level increased | | |
| L3 | Cooldown: same user, rapid messages | XP only awarded once per cooldown | | |
| L4 | `/level` | Current level/XP displayed | | |
| L5 | `/leaderboard` | Top users displayed | | |
| L6 | Dashboard: View leaderboard | Leaderboard displayed | | |
| L7 | Dashboard: View user detail | XP/level info shown | | |

### 9.15 GIVEAWAYS

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| G1 | Create giveaway `/giveaway` | Giveaway embed posted | | |
| G2 | Click enter button | User entered | | |
| G3 | Click enter again (duplicate) | Already entered message | | |
| G4 | Click leave button | User removed from entries | | |
| G5 | Giveaway ends (timer) | Winners selected, announced | | |
| G6 | Reroll giveaway | New winners selected | | |
| G7 | Cancel giveaway | Status → CANCELLED | | |
| G8 | Dashboard: View giveaways | Giveaways listed | | |
| G9 | Dashboard: View giveaway detail | Entries/winners shown | | |

### 9.16 EVENTS

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| E1 | Create event `/event` | Event created (UPCOMING) | | |
| E2 | Start event (creator or ManageGuild) | Status → ACTIVE | | |
| E3 | Join event | User added to participants | | |
| E4 | Leave event | User removed from participants | | |
| E5 | End event | Status → ENDED, winners selected | | |
| E6 | Cancel event | Status → CANCELLED | | |
| E7 | Dashboard: View events | Events listed | | |

### 9.17 POLLS

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| P1 | Create poll `/poll` | Poll embed posted | | |
| P2 | Vote on option | Vote recorded | | |
| P3 | Change vote (single-choice) | Previous vote removed, new vote recorded | | |
| P4 | End poll | Results displayed | | |
| P5 | Anonymous poll: check voter list | Voters hidden | | |
| P6 | Dashboard: View polls | Polls listed | | |
| P7 | Dashboard: View poll results | Vote counts + percentages | | |

### 9.18 REMINDERS

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| RM1 | Create reminder `/reminder 1h Test` | Reminder created, scheduled | | |
| RM2 | Wait for reminder to trigger | Message sent in channel | | |
| RM3 | Cancel reminder | Status → CANCELLED | | |
| RM4 | Exceed max active reminders (20) | Limit error | | |
| RM5 | Create reminder with invalid duration | Validation error | | |
| RM6 | Dashboard: View reminders | Reminders listed | | |

### 9.19 DASHBOARD

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| D1 | Login page loads | Discord login button visible | | |
| D2 | OAuth2 flow completes | Redirected to dashboard | | |
| D3 | Guild selector populated | User's guilds listed | | |
| D4 | Switch guild | Dashboard data updates | | |
| D5 | All 16 pages load | No errors, loading states shown | | |
| D6 | Settings page: save changes | Config persisted | | |
| D7 | Logout | Session destroyed, redirected | | |
| D8 | Mobile responsive | Sidebar collapses, bottom nav appears | | |

### 9.20 ANALYTICS

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| AN1 | Dashboard: Overview page | Stats displayed | | |
| AN2 | Dashboard: Period selector (7D/30D/90D) | Data updates | | |
| AN3 | Message events increment counters | Analytics counters increase | | |
| AN4 | Moderation actions increment counters | Moderation counter increases | | |

### 9.21 SETTINGS

| # | Test | Expected Result | Actual Result | PASS/FAIL |
|---|------|-----------------|---------------|-----------|
| S1 | Change language setting | Setting saved | | |
| S2 | Change timezone setting | Setting saved | | |
| S3 | Reset settings | Confirmation modal shown | | |

---

## 10. POST-DEPLOYMENT VERIFICATION

### Bot Status
- [ ] Bot appears online in Discord (green dot)
- [ ] Bot responds to `/ping`
- [ ] Bot responds to `/help`
- [ ] Bot responds to `/botinfo`

### Slash Commands
- [ ] All commands registered (check Discord Developer Portal > Bot > Commands)
- [ ] Commands visible in server (type `/` to see list)
- [ ] Commands respond correctly

### Dashboard
- [ ] Dashboard accessible at `DASHBOARD_URL`
- [ ] Login button works
- [ ] OAuth2 flow completes successfully
- [ ] Guild list loads
- [ ] All pages load without errors

### Database
- [ ] Supabase connection successful
- [ ] All migrations applied
- [ ] RPC functions exist (`get_next_case_number`, `increment_analytics_metric`)
- [ ] Can read/write data

### API
- [ ] Health endpoint responds: `GET /api/health`
- [ ] Auth endpoints work: `/api/auth/login`, `/api/auth/me`
- [ ] Guild endpoints work: `/api/guilds`
- [ ] Rate limiting works (rapid requests → 429)

### Logs
- [ ] Bot startup logged
- [ ] Command executions logged
- [ ] Errors logged with errorId
- [ ] Sensitive data redacted in logs

### Error Handling
- [ ] Invalid commands return user-friendly errors
- [ ] Database errors logged, not exposed
- [ ] Discord API errors handled gracefully
- [ ] Graceful shutdown on SIGTERM

---

## 11. TROUBLESHOOTING

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Bot offline | Invalid token | Regenerate token in Developer Portal |
| Commands not appearing | Not deployed | Run bot (commands deploy on startup) |
| Dashboard can't login | OAuth2 misconfigured | Check redirect URLs in Developer Portal |
| Dashboard can't load guilds | Missing `guilds` scope | Re-authorize OAuth2 with `guilds` scope |
| Session not persisting | Cookie settings | Ensure HTTPS for `secure: true` |
| 401 on all API endpoints | Session expired | Re-login, check SESSION_SECRET |
| Rate limit too aggressive | In-memory limits | Adjust rate limit values in rateLimit.ts |
| Database connection failed | Supabase down | Check Supabase status, verify URL/keys |
| XP not updating | Missing intent | Enable MESSAGE CONTENT intent |
| Welcome not sending | Missing intent | Enable SERVER MEMBERS intent |

### Log Levels
- `INFO` — Normal operations
- `WARN` — Degraded but continuing
- `ERROR` — Failure requiring attention
- Use `errorId` from logs to trace issues

---

## 12. DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                    PRODUCTION                        │
│                                                     │
│  ┌──────────┐     ┌──────────┐     ┌──────────────┐ │
│  │ Discord   │────▶│ Eltron   │────▶│   Supabase   │ │
│  │ Gateway   │◀────│ Bot + API│◀────│  PostgreSQL  │ │
│  └──────────┘     └────┬─────┘     └──────────────┘ │
│                        │                             │
│                        │ port 3001                   │
│                        ▼                             │
│                 ┌──────────────┐                     │
│                 │   Nginx /    │                     │
│                 │   Static     │                     │
│                 │   Files      │                     │
│                 └──────┬───────┘                     │
│                        │                             │
│                        │ HTTPS                       │
│                        ▼                             │
│                 ┌──────────────┐                     │
│                 │   Browser    │                     │
│                 │  (Dashboard) │                     │
│                 └──────────────┘                     │
└─────────────────────────────────────────────────────┘
```

---

## 13. DEPLOYMENT COMMANDS

```bash
# 1. Build backend
npm run build

# 2. Build frontend
cd dashboard && npm run build && cd ..

# 3. Apply database migrations
npx tsx scripts/migrate.ts

# 4. Verify migrations
npx tsx scripts/migrate.ts status

# 5. Start bot (deploys commands + starts API)
npm run start

# 6. Verify health
curl https://yourdomain.com/api/health
```

---

*This document does NOT contain any real secrets, tokens, or credentials.*
*All values marked as REDACTED must be filled with actual production values during deployment.*
