import { DiscordUser } from './discord';

declare module 'express-session' {
  interface SessionData {
    user?: DiscordUser;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: number;
    oauthState?: string;
  }
}

export interface SessionUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
}

export function isAuthenticated(
  req: { session?: { user?: DiscordUser; tokenExpiry?: number } }
): req is { session: { user: DiscordUser; tokenExpiry: number } } {
  return !!req.session?.user && !!req.session?.tokenExpiry;
}

export function isTokenValid(tokenExpiry: number): boolean {
  return Date.now() < tokenExpiry - 60000;
}
