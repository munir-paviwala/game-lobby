/**
 * engine/peer.ts
 * Trystero connection manager.
 *
 * Wraps the Trystero API to give the rest of the app a simple interface:
 *   - joinRoom() / leaveRoom()
 *   - sendAction() — clients send actions to the host
 *   - broadcast() — host sends state syncs to all peers
 *   - onMessage() — register a callback for incoming messages
 *
 * Uses the Nostr strategy (most reliable, no DHT setup needed in browser).
 */

import { joinRoom as trysteroJoin, type Room, selfId as trysteroSelfId } from 'trystero/nostr';
import type {
	PeerMessage,
	ActionMessage,
	StateSyncMessage,
	WelcomeMessage,
	AnnounceMessage,
	GameState,
	Action
} from './types';

// ─── App-level config ─────────────────────────────────────────────────────────

/**
 * Trystero requires a unique app ID across all rooms on the same signaling
 * network. Use a reverse-domain style string.
 */
const APP_ID = 'io.github.munir-paviwala.game-lobby';

/**
 * Stable public Nostr relays to ensure all peers find each other.
 * Using multiple high-availability relays reduces "different room" syndrome.
 */
const RELAYS = [
	'wss://relay.damus.io',
	'wss://nos.lol',
	'wss://relay.snort.social',
	'wss://purplepag.es'
];

// ─── Module state ─────────────────────────────────────────────────────────────

let currentRoom: Room | null = null;
let currentRoomId: string | null = null;


type MessageHandler = (message: PeerMessage, peerId: string) => void;
const messageHandlers: Set<MessageHandler> = new Set();

type PeerHandler = (peerId: string) => void;
const joinHandlers: Set<PeerHandler> = new Set();
const leaveHandlers: Set<PeerHandler> = new Set();

type StreamHandler = (stream: MediaStream, peerId: string) => void;
const streamHandlers: Set<StreamHandler> = new Set();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Join (or create) a room. Idempotent — calling with the same roomId is a no-op.
 * If already in a different room, leaves first.
 */
export async function joinRoom(roomId: string): Promise<void> {
	const cleanId = roomId.trim().toLowerCase();
	if (currentRoomId === cleanId && currentRoom) return;
	if (currentRoom) leaveRoom();

	console.log(`[P2P] Joining room: ${cleanId} on relays:`, RELAYS);
	const room = trysteroJoin({ appId: APP_ID, relays: RELAYS }, cleanId);
	currentRoom = room;
	currentRoomId = cleanId;

	const [, getMessage] = room.makeAction<any>('msg');

	getMessage((data, peerId) => {
		messageHandlers.forEach((h) => h(data as PeerMessage, peerId));
	});

	room.onPeerJoin((peerId) => {
		joinHandlers.forEach((h) => h(peerId));
	});

	room.onPeerLeave((peerId) => {
		leaveHandlers.forEach((h) => h(peerId));
	});

	// Cast to any to bypass strict type checking for the media stream callback
	(room as any).onPeerStream((stream: MediaStream, peerId: string) => {
		streamHandlers.forEach((h) => h(stream, peerId));
	});
}

/** Leave the current room and clean up. */
export function leaveRoom(): void {
	if (currentRoom) {
		currentRoom.leave();
		currentRoom = null;
		currentRoomId = null;
	}
}

/** Get the current Trystero self-peer ID (stable for session duration). */
export function selfId(): string {
	return currentRoom ? trysteroSelfId : '';
}

/**
 * Send a message to one specific peer.
 * Used by clients to send ANNOUNCE/ACTION to host,
 * and by host to send WELCOME to a specific new joiner.
 */
export function sendTo(peerId: string, message: PeerMessage): void {
	if (!currentRoom) return;
	const [sendMsg] = currentRoom.makeAction<any>('msg');
	sendMsg(message as any, [peerId]);
}

/**
 * Broadcast a message to ALL peers in the room.
 * Used by the host to send STATE_SYNC updates.
 */
export function broadcast(message: PeerMessage): void {
	if (!currentRoom) return;
	const [sendMsg] = currentRoom.makeAction<any>('msg');
	sendMsg(message as any);
}

/** Register a callback for all incoming peer messages. */
export function onMessage(handler: MessageHandler): () => void {
	messageHandlers.add(handler);
	return () => messageHandlers.delete(handler);
}

/** Register a callback for when a peer joins. */
export function onPeerJoin(handler: PeerHandler): () => void {
	joinHandlers.add(handler);
	return () => joinHandlers.delete(handler);
}

/** Register a callback for when a peer leaves. */
export function onPeerLeave(handler: PeerHandler): () => void {
	leaveHandlers.add(handler);
	return () => leaveHandlers.delete(handler);
}

/** Share a local media stream with all peers. */
export function addStream(stream: MediaStream): void {
	if (currentRoom) (currentRoom as any).addStream(stream);
}

/** Stop sharing a local media stream. */
export function removeStream(stream: MediaStream): void {
	if (currentRoom) (currentRoom as any).removeStream(stream);
}

/** Register a callback for when a remote peer shares a stream. */
export function onPeerStream(handler: StreamHandler): () => void {
	streamHandlers.add(handler);
	return () => streamHandlers.delete(handler);
}

// ─── Typed convenience senders ────────────────────────────────────────────────

export function sendAnnounce(hostId: string, msg: Omit<AnnounceMessage, 'kind'>): void {
	sendTo(hostId, { kind: 'ANNOUNCE', ...msg });
}

export function sendAction(hostId: string, action: Action): void {
	sendTo(hostId, { kind: 'ACTION', action } satisfies ActionMessage);
}

export function broadcastStateSync(state: GameState): void {
	broadcast({ kind: 'STATE_SYNC', state } satisfies StateSyncMessage);
}

export function sendWelcome(peerId: string, msg: Omit<WelcomeMessage, 'kind'>): void {
	sendTo(peerId, { kind: 'WELCOME', ...msg } satisfies WelcomeMessage);
}
