/**
 * engine/crypto.ts
 * Tiny Web Crypto helper for hashing room passwords client-side.
 * Uses SHA-256 via the browser's built-in SubtleCrypto — no external deps.
 */

/**
 * Hash a plain-text password to a hex string using SHA-256.
 * Returns null if the input is empty/blank (open rooms).
 */
export async function hashPassword(password: string): Promise<string | null> {
	const trimmed = password.trim();
	if (!trimmed) return null;

	const encoder = new TextEncoder();
	const data = encoder.encode(trimmed);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
