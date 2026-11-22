import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export const USER_COOKIE_NAME = 'kalamuji_session';
export const ADMIN_COOKIE_NAME = 'kalamuji_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days for user
const ADMIN_TTL_SECONDS = 60 * 60 * 24; // 24 hours for admin

function getSigningSecret(): string {
  const secret =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!secret || secret.length < 16) {
    throw new Error('ADMIN_SESSION_SECRET must be set (minimum 16 characters).');
  }
  return secret;
}

function sha256(value: string): Buffer {
  return crypto.createHash('sha256').update(value).digest();
}

export function verifyEnvAdminCredentials(email: string, password: string): boolean {
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD;

  if (!envEmail || !envPassword) return false;

  const emailMatch = crypto.timingSafeEqual(
    sha256(email.trim().toLowerCase()),
    sha256(envEmail)
  );
  const passwordMatch = crypto.timingSafeEqual(sha256(password), sha256(envPassword));

  return emailMatch && passwordMatch;
}

function signToken(userId: string, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}.${exp}`;
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex');
  return `${payload}.${sig}`;
}

function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [userId, expStr, providedSig] = parts;
  const exp = Number(expStr);
  if (!userId || !Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) {
    return null;
  }

  try {
    const expectedSig = crypto
      .createHmac('sha256', getSigningSecret())
      .update(`${userId}.${expStr}`)
      .digest('hex');

    const valid = crypto.timingSafeEqual(sha256(providedSig), sha256(expectedSig));
    return valid ? userId : null;
  } catch {
    return null;
  }
}

export function createSignedUserToken(userId: string): string {
  return signToken(userId, SESSION_TTL_SECONDS);
}

export function createSignedAdminToken(userId: string): string {
  return signToken(userId, ADMIN_TTL_SECONDS);
}

export async function getVerifiedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_COOKIE_NAME)?.value;
  return verifyToken(token);
}

export async function getVerifiedAdminUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyToken(token);
}
