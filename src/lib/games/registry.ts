/**
 * games/registry.ts
 * Central manifest of all available games.
 * To add a new game: import its module and add an entry here.
 */

import type { Component } from 'svelte';
import type { GameState, Action } from '$lib/engine/types';

// ─── Game Module Interface ────────────────────────────────────────────────────

export interface GameModule {
	/** Unique slug — used in URLs and state */
	id: string;
	/** Human-readable name shown in the lobby */
	name: string;
	/** Short description shown in the game picker */
	description: string;
	/** Emoji icon for the game picker UI */
	emoji: string;
	/** Min/max player counts */
	minPlayers: number;
	maxPlayers: number;
	/**
	 * The main Svelte component for this game.
	 * Receives the full gameState and an onAction callback as props.
	 */
	component: Component<{
		state: GameState;
		isHost: boolean;
		selfId: string;
		onAction: (action: Action) => void;
	}>;
	/**
	 * Pure reducer for game-specific GAME_ACTION payloads.
	 * Returns a new copy of game.data — never mutates.
	 */
	reducer: (data: unknown, action: Action) => unknown;
}

import HerdMentality from './herd-mentality/index.svelte';
import { reducer as hmReducer } from './herd-mentality/reducer';

import CheeseThief from './cheese-thief/index.svelte';
import { reducer as ctReducer } from './cheese-thief/reducer';

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * All registered games. Import and register game modules here.
 */
const registry: GameModule[] = [
	{
		id: 'herd-mentality',
		name: 'Herd Mentality',
		description: 'Think like the herd! Write down the same answer as everyone else.',
		emoji: '🐄',
		minPlayers: 4,
		maxPlayers: 20,
		component: HerdMentality as unknown as GameModule['component'],
		reducer: hmReducer
	},
	{
		id: 'cheese-thief',
		name: 'Cheese Thief',
		description: 'A social deduction game of sleeping, waking, and stealing cheese.',
		emoji: '🧀',
		minPlayers: 4,
		maxPlayers: 8,
		component: CheeseThief as unknown as GameModule['component'],
		reducer: ctReducer
	}
];

export function getGame(id: string): GameModule | undefined {
	return registry.find((g) => g.id === id);
}

export function listGames(): GameModule[] {
	return registry;
}
