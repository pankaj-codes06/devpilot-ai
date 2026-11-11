import crypto from 'node:crypto';
import type { CookieOptions } from 'express';
import { env } from '../config/env.js';

/**
 * Generates a cryptographically secure random token (e.g. for OAuth state).
 */
export function generateRandomState(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Signs payload data with HMAC-SHA256 into a secure tamper-proof session token.
 */
export function signSessionPayload(data: Record<string, unknown>): string {
  const json = JSON.stringify({
    ...data,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days expiration
  });
  const encodedData = Buffer.from(json).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(encodedData)
    .digest('base64url');

  return `${encodedData}.${signature}`;
}

/**
 * Verifies and decodes a signed session token. Returns null if invalid or expired.
 */
export function verifySessionPayload<T extends Record<string, unknown>>(
  token: string | undefined
): T | null {
  if (!token || !token.includes('.')) {
    return null;
  }

  const [encodedData, signature] = token.split('.');
  if (!encodedData || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(encodedData)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const json = Buffer.from(encodedData, 'base64url').toString('utf-8');
    const parsed = JSON.parse(json);

    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Default secure cookie options.
 */
export function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

