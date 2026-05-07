/**
 * engine/stateStore.ts
 * The central reactive game state store and action dispatcher.
 *
 * Architecture:
 *  - A single Svelte 5 rune-based store owns GameState.
 *  - All mutations go through dispatchAction() — never direct mutation.
 *  - Host applies the reducer and re-broadcasts to all peers.
 *  - Clients receive STATE_SYNC messages and call syncState() to update.
 */

import { writable, derived } from 'svelte/store';
import type { GameState, Action, Player } from './types';
import { getGame } from '$lib/games/registry';

// ─── Initial State ─────────────────────────────────────────────────────────

function createInitialState(): GameState {
	return {
		phase: 'lobby',
		players: {},
		scores: {},
		game: {
			id: null,
			data: null
		}
	};
}

// ─── The Store ────────────────────────────────────────────────────────────────

const { subscribe, set, update } = writable<GameState>(createInitialState());

export const gameState = { subscribe };

/** Replace the entire state (used by clients on STATE_SYNC receipt) */
export function syncState(newState: GameState) {
	set(newState);
}

/** Reset to initial state (e.g. when leaving a room) */
export function resetState() {
	set(createInitialState());
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

/**
 * Pure state reducer. Takes current state + action, returns next state.
 * Game-specific actions (GAME_ACTION) are delegated to the active game's reducer.
 */
export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'PLAYER_JOIN': {
			const player = action.payload as unknown as Player;
			return {
				...state,
				players: {
					...state.players,
					[player.id]: player
				},
				scores: {
					...state.scores,
					[player.id]: state.scores[player.id] ?? 0
				}
			};
		}

		case 'PLAYER_LEAVE': {
			const { playerId } = action.payload as { playerId: string };
			const players = { ...state.players };
			delete players[playerId];
			return { ...state, players };
		}

		case 'HOST_SET_GAME': {
			const { gameId } = action.payload as { gameId: string };
			return {
				...state,
				game: { id: gameId, data: null }
			};
		}

		case 'START_GAME': {
			return { ...state, phase: 'playing' };
		}

		case 'END_GAME': {
			return { ...state, phase: 'ended' };
		}

		case 'ADD_POINTS': {
			const { points } = action.payload as { points: Record<string, number> };
			const newScores = { ...state.scores };
			for (const [peerId, pts] of Object.entries(points)) {
				newScores[peerId] = (newScores[peerId] ?? 0) + pts;
			}
			return { ...state, scores: newScores };
		}

		case 'GAME_ACTION': {
			// Delegated to the active game module's reducer.
			if (state.game.id) {
				const gameModule = getGame(state.game.id);
				if (gameModule) {
					return {
						...state,
						game: {
							...state.game,
							data: gameModule.reducer(state.game.data, action)
						}
					};
				}
			}
			return state;
		}

		default:
			return state;
	}
}

// ─── Dispatch (Host only) ─────────────────────────────────────────────────────

/**
 * Apply an action to the store. Returns the new state so the host
 * can immediately broadcast it to all peers.
 *
 * Only the HOST calls this. Clients call syncState() instead.
 */
export function applyAction(action: Action): GameState {
	let next: GameState = createInitialState();
	update((current) => {
		next = reduce(current, action);
		return next;
	});
	return next;
}

// ─── Derived convenience selectors ───────────────────────────────────────────

/** Sorted list of players by join time */
export const playerList = derived(gameState, ($s) =>
	Object.values($s.players).sort((a, b) => a.joinedAt - b.joinedAt)
);

/** Is the game currently in the playing phase? */
export const isPlaying = derived(gameState, ($s) => $s.phase === 'playing');
