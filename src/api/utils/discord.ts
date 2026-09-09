import { logger } from '../../utils/logger';
import { env } from '../../config/env';

const DISCORD_API = 'https://discord.com/api/v10';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<DiscordTokenResponse> {
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let discordCode: number | undefined;
    let discordMessage: string | undefined;
    try {
      const parsed = JSON.parse(body);
      discordCode = parsed.code;
      discordMessage = parsed.message;
    } catch {}
    logger.error({ status: res.status, discordCode, discordMessage, endpoint: '/oauth2/token' }, '[Discord] exchangeCode failed');
    throw new Error(`Discord token exchange failed: ${res.status} code=${discordCode ?? 'N/A'} message=${discordMessage ?? 'N/A'}`);
  }

  return res.json() as Promise<DiscordTokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<DiscordTokenResponse> {
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let discordCode: number | undefined;
    let discordMessage: string | undefined;
    try {
      const parsed = JSON.parse(body);
      discordCode = parsed.code;
      discordMessage = parsed.message;
    } catch {}
    logger.error({ status: res.status, discordCode, discordMessage, endpoint: '/oauth2/token' }, '[Discord] refreshAccessToken failed');
    throw new Error(`Discord token refresh failed: ${res.status} code=${discordCode ?? 'N/A'} message=${discordMessage ?? 'N/A'}`);
  }

  return res.json() as Promise<DiscordTokenResponse>;
}

export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let discordCode: number | undefined;
    let discordMessage: string | undefined;
    try {
      const parsed = JSON.parse(body);
      discordCode = parsed.code;
      discordMessage = parsed.message;
    } catch {}
    logger.error({ status: res.status, discordCode, discordMessage, endpoint: '/users/@me' }, '[Discord] getDiscordUser failed');
    throw new Error(`Discord /users/@me failed: ${res.status} code=${discordCode ?? 'N/A'} message=${discordMessage ?? 'N/A'}`);
  }

  return res.json() as Promise<DiscordUser>;
}

export async function getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let discordCode: number | undefined;
    let discordMessage: string | undefined;
    try {
      const parsed = JSON.parse(body);
      discordCode = parsed.code;
      discordMessage = parsed.message;
    } catch {}
    logger.error({ status: res.status, discordCode, discordMessage, endpoint: '/users/@me/guilds' }, '[Discord] getUserGuilds failed');
    throw new Error(`Discord /users/@me/guilds failed: ${res.status} code=${discordCode ?? 'N/A'} message=${discordMessage ?? 'N/A'}`);
  }

  return res.json() as Promise<DiscordGuild[]>;
}
