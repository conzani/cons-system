const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_ENTRIES = 5000;

type Entry = {
	failures: number;
	windowStart: number;
	blockedUntil: number;
};

const entries = new Map<string, Entry>();

function prune(now: number) {
	if (entries.size < MAX_ENTRIES) return;
	for (const [key, entry] of entries) {
		if (entry.blockedUntil < now && now - entry.windowStart > WINDOW_MS) entries.delete(key);
	}
}

/** In-memory login throttling (per server instance). */
export function loginRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
	const now = Date.now();
	prune(now);

	const entry = entries.get(key);
	if (!entry) return { allowed: true, retryAfterSeconds: 0 };

	if (entry.blockedUntil > now) {
		return { allowed: false, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) };
	}

	if (now - entry.windowStart > WINDOW_MS) {
		entries.delete(key);
		return { allowed: true, retryAfterSeconds: 0 };
	}

	return { allowed: true, retryAfterSeconds: 0 };
}

export function recordLoginFailure(key: string): void {
	const now = Date.now();
	const entry = entries.get(key);

	if (!entry || now - entry.windowStart > WINDOW_MS) {
		entries.set(key, { failures: 1, windowStart: now, blockedUntil: 0 });
		return;
	}

	entry.failures += 1;
	if (entry.failures >= MAX_FAILURES) {
		entry.blockedUntil = now + BLOCK_MS;
	}
}

export function clearLoginRateLimit(key: string): void {
	entries.delete(key);
}
