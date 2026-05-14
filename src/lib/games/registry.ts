/**
 * games/registry.ts
 * Central manifest of all available games.
 * To add a new game: import its module and add an entry here.
 */

import type { Component } from 'svelte';
import type { GameState, Action, GameTheme } from '$lib/engine/types';

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
	/** Visual styling for the "tabletop" UI */
	theme: GameTheme;
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

import JustOne from './just-one/index.svelte';
import { reducer as joReducer } from './just-one/reducer';

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
		minPlayers: 3,
		maxPlayers: 20,
		theme: {
			primary: '#424242',      // Cow Black
			secondary: '#F5F5F5',    // Cream White
			accent: '#F48FB1',       // Udder Pink
			background: '#E0E0E0',   // Light Grey
			text: '#212121'
		},
		component: HerdMentality as unknown as GameModule['component'],
		reducer: hmReducer
	},
	{
		id: 'cheese-thief',
		name: 'Cheese Thief',
		description: 'A social deduction game of sleeping, waking, and stealing cheese.',
		emoji: '🧀',
		minPlayers: 3,
		maxPlayers: 8,
		theme: {
			primary: '#FBC02D',      // Cheese Yellow
			secondary: '#FFF9C4',    // Pastel Yellow
			accent: '#FF7043',       // Deep Orange
			background: '#FFF3E0',   // Warm Parchment
			text: '#4E342E'
		},
		component: CheeseThief as unknown as GameModule['component'],
		reducer: ctReducer
	},
	{
		id: 'just-one',
		name: 'Just One',
		description: 'A cooperative party game where you write one-word clues to help the guesser!',
		emoji: '☝️',
		minPlayers: 3,
		maxPlayers: 7,
		theme: {
			primary: '#1976D2',      // Blue
			secondary: '#BBDEFB',    // Light Blue
			accent: '#FFC107',       // Amber
			background: '#F0F4C3',   // Light Lime
			text: '#212121'
		},
		component: JustOne as unknown as GameModule['component'],
		reducer: joReducer
	}
];

export function getGame(id: string): GameModule | undefined {
	return registry.find((g) => g.id === id);
}

export function listGames(): GameModule[] {
	return registry;
}
