/**
 * engine/types.ts
 * Shared TypeScript types for game state, actions, and peer messages.
 */

// ─── Player ──────────────────────────────────────────────────────────────────

export interface Player {
	id: string;      // Trystero peer ID
	name: string;
	isHost: boolean;
	joinedAt: number; // epoch ms
}

// ─── Room ────────────────────────────────────────────────────────────────────

export interface RoomMeta {
	roomId: string;
	passwordHash: string | null; // SHA-256 hex of the password, or null if open
	hostId: string;
	gameId: string | null;        // null = no game selected yet
}

export interface GameTheme {
	primary: string;
	secondary: string;
	accent: string;
	background: string;
	text: string;
}

// ─── Game State ──────────────────────────────────────────────────────────────

export interface GameState {
	phase: 'lobby' | 'playing' | 'ended';
	players: Record<string, Player>; // keyed by peer id
	scores: Record<string, number>;  // keyed by peer id
	// game-specific data lives in game.data — the game's reducer owns its shape
	game: {
		id: string | null;
		data: unknown;
	};
	version: number; // For reliability: incremented on every action
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type ActionType =
	| 'PLAYER_JOIN'
	| 'PLAYER_LEAVE'
	| 'HOST_SET_GAME'
	| 'START_GAME'
	| 'END_GAME'
	| 'BACK_TO_LOBBY'
	| 'ADD_POINTS'
	| 'GAME_ACTION'; // game-specific sub-actions live in payload.type

export interface Action {
	type: ActionType;
	payload: Record<string, unknown>;
	// senderId is stamped by the engine, not the client
	senderId?: string;
}

// ─── Peer Messages ───────────────────────────────────────────────────────────

/**
 * The host sends a full STATE_SYNC to all peers after every state change.
 */
export interface StateSyncMessage {
	kind: 'STATE_SYNC';
	state: GameState;
}

/**
 * Clients send ACTIONs to the host for processing.
 */
export interface ActionMessage {
	kind: 'ACTION';
	action: Action;
}

/**
 * Host sends presence info on initial handshake.
 */
export interface WelcomeMessage {
	kind: 'WELCOME';
	room: RoomMeta;
	state: GameState;
}

/**
 * Clients announce themselves to the host on join.
 */
export interface AnnounceMessage {
	kind: 'ANNOUNCE';
	name: string;
	passwordHash: string | null;
}

export type PeerMessage =
	| StateSyncMessage
	| ActionMessage
	| WelcomeMessage
	| AnnounceMessage;
