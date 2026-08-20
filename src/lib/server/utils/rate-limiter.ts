interface RateLimitEntry {
	count: number;
	resetAt: number;
}

class SimpleRateLimiter {
	private map = new Map<string, RateLimitEntry>();

	/**
	 * Check if a request identified by `key` exceeds limit within `windowMs`.
	 * Returns { allowed: boolean, remaining: number, resetInMs: number }
	 */
	check(key: string, limit: number = 5, windowMs: number = 10000): { allowed: boolean; remaining: number; resetInMs: number } {
		const now = Date.now();
		const entry = this.map.get(key);

		if (!entry || now > entry.resetAt) {
			this.map.set(key, { count: 1, resetAt: now + windowMs });
			return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
		}

		if (entry.count >= limit) {
			return { allowed: false, remaining: 0, resetInMs: entry.resetAt - now };
		}

		entry.count += 1;
		return { allowed: true, remaining: limit - entry.count, resetInMs: entry.resetAt - now };
	}

	/**
	 * Cleanup expired keys periodically to avoid memory growth
	 */
	cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.map.entries()) {
			if (now > entry.resetAt) {
				this.map.delete(key);
			}
		}
	}
}

export const attendanceRateLimiter = new SimpleRateLimiter();
export const authRateLimiter = new SimpleRateLimiter();
export const uploadRateLimiter = new SimpleRateLimiter();
