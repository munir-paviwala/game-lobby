/**
 * engine/session.ts
 * Manages the local player session: name, host role, current room.
 * Persists to localStorage so a host survives a page refresh.
 */

import { writable, derived, get } from 'svelte/store';
import type { RoomMeta } from './types';

// ─── Stores ───────────────────────────────────────────────────────────────────

export const playerName = writable<string>('');
export const isHost = writable<boolean>(false);
export const hostPeerId = writable<string>(''); // the host's Trystero peer ID
export const roomMeta = writable<RoomMeta | null>(null);

// ─── Derived ──────────────────────────────────────────────────────────────────

export const inRoom = derived(roomMeta, ($r) => $r !== null);

// ─── Persistence ─────────────────────────────────────────────────────────────

const SESSION_KEY = 'game-lobby:session';

interface PersistedSession {
	playerName: string;
	isHost: boolean;
	hostPeerId: string;
	roomMeta: RoomMeta | null;
}

export function saveSession(): void {
	const session: PersistedSession = {
		playerName: get(playerName),
		isHost: get(isHost),
		hostPeerId: get(hostPeerId),
		roomMeta: get(roomMeta)
	};
	try {
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	} catch {
		// Storage quota exceeded — non-fatal
	}
}

export function loadSession(): PersistedSession | null {
	try {
		const raw = localStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as PersistedSession;
	} catch {
		return null;
	}
}

export function clearSession(): void {
	localStorage.removeItem(SESSION_KEY);
	playerName.set('');
	isHost.set(false);
	hostPeerId.set('');
	roomMeta.set(null);
}

export function restoreSession(): boolean {
	const saved = loadSession();
	if (!saved || !saved.roomMeta) return false;
	playerName.set(saved.playerName);
	isHost.set(saved.isHost);
	hostPeerId.set(saved.hostPeerId);
	roomMeta.set(saved.roomMeta);
	return true;
}
