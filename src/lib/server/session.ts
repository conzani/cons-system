import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

export const SESSION_COOKIE = 'session';
/** 12 hours: long enough for a site shift, short enough to limit a stolen cookie. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const DEV_FALLBACK_SECRET = 'konzani-development-only-session-secret-change-me';
let warnedAboutFallback = false;

function getSecret(): string {
	const configured = env.SESSION_SECRET || process.env.SESSION_SECRET || '';
	if (configured.length >= 32) return configured;

	if (process.env.NODE_ENV === 'production') {
		throw new Error('SESSION_SECRET must be set to at least 32 characters in production');
	}

	if (!warnedAboutFallback) {
		console.warn(
			'[security] SESSION_SECRET is not set. Using an insecure development fallback; set it in .env before deploying.'
		);
		warnedAboutFallback = true;
	}
	return DEV_FALLBACK_SECRET;
}

function sign(payload: string): string {
	return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

/**
 * Creates a signed, expiring session token of the form `<payload>.<hmac>`.
 * The payload is an opaque base64url JSON object; it cannot be tampered with
 * without invalidating the HMAC.
 */
export function createSessionToken(userId: bigint, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): string {
	const payload = Buffer.from(
		JSON.stringify({ uid: userId.toString(), exp: Date.now() + maxAgeSeconds * 1000 })
	).toString('base64url');
	return `${payload}.${sign(payload)}`;
}

/** Returns the user id for a valid, unexpired, correctly signed token, otherwise null. */
export function verifySessionToken(token: string | null | undefined): bigint | null {
	if (!token) return null;

	const parts = token.split('.');
	if (parts.length !== 2) return null;
	const [payload, signature] = parts;
	if (!payload || !signature) return null;

	const expected = Buffer.from(sign(payload));
	const given = Buffer.from(signature);
	if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

	try {
		const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
			uid?: string;
			exp?: number;
		};
		if (!data.uid || !/^\d+$/.test(data.uid)) return null;
		if (typeof data.exp !== 'number' || data.exp <= Date.now()) return null;
		return BigInt(data.uid);
	} catch {
		return null;
	}
}

export function setSessionCookie(cookies: Cookies, userId: bigint): void {
	cookies.set(SESSION_COOKIE, createSessionToken(userId), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: SESSION_MAX_AGE_SECONDS
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
