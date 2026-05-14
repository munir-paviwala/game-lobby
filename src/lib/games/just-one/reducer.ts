import type { Action } from '$lib/engine/types';
import cards from './cards.json';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JOData {
	phase: 'waiting' | 'cluing' | 'eliminating' | 'guessing' | 'scored';
	round: number;
	/** Ordered player IDs for guesser rotation */
	playerOrder: string[];
	/** Index into playerOrder — who is the current guesser */
	guesserIndex: number;
	/** The currently active card from the deck */
	activeCard: { card: number; words: string[] } | null;
	/** Which word index (0-4) the guesser must guess */
	activeWordIndex: number;
	/** The secret word — shown to clue-givers, hidden from guesser */
	secretWord: string | null;
	/** Clues submitted by each clue-giver: peerId -> clue */
	clues: Record<string, string>;
	/** Set of peerIds whose clues were eliminated (duplicates) */
	eliminated: string[];
	/** The guesser's guess */
	guess: string | null;
	/** Whether the round was scored correct */
	correct: boolean | null;
	/** Cards used so we don't repeat */
	usedCards: number[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function drawCard(used: number[]): { card: number; words: string[] } | null {
	const available = (cards as { card: number; words: string[] }[]).filter(
		(c) => !used.includes(c.card)
	);
	if (available.length === 0) return null;
	return available[Math.floor(Math.random() * available.length)];
}

function pickWordIndex(card: { words: string[] }): number {
	return Math.floor(Math.random() * card.words.length);
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function reducer(data: unknown, action: Action): unknown {
	let state = data as JOData;
	if (!state) {
		state = {
			phase: 'waiting',
			round: 1,
			playerOrder: [],
			guesserIndex: 0,
			activeCard: null,
			activeWordIndex: 0,
			secretWord: null,
			clues: {},
			eliminated: [],
			guess: null,
			correct: null,
			usedCards: []
		};
	}

	const payload = action.payload;

	switch (payload.type) {
		case 'JO_INIT': {
			// Host seeds player order and starts first round
			const playerOrder = payload.playerOrder as string[];
			const card = drawCard([]);
			if (!card) return state;
			const wordIndex = pickWordIndex(card);
			return {
				...state,
				playerOrder,
				guesserIndex: 0,
				phase: 'cluing',
				round: 1,
				activeCard: card,
				activeWordIndex: wordIndex,
				secretWord: card.words[wordIndex],
				clues: {},
				eliminated: [],
				guess: null,
				correct: null,
				usedCards: [card.card]
			};
		}

		case 'JO_SUBMIT_CLUE': {
			const clue = (payload.clue as string).trim().toUpperCase();
			return {
				...state,
				clues: {
					...state.clues,
					[action.senderId!]: clue
				}
			};
		}

		case 'JO_ELIMINATE': {
			// Host sends the list of eliminated peerIds after reviewing duplicates
			return {
				...state,
				phase: 'guessing',
				eliminated: payload.eliminated as string[]
			};
		}

		case 'JO_SUBMIT_GUESS': {
			const guess = (payload.guess as string).trim().toUpperCase();
			const correct = guess === (state.secretWord ?? '').toUpperCase();
			return {
				...state,
				phase: 'scored',
				guess,
				correct
			};
		}

		case 'JO_NEXT_ROUND': {
			const nextGuesserIndex = (state.guesserIndex + 1) % Math.max(state.playerOrder.length, 1);
			const card = drawCard(state.usedCards);
			if (!card) return { ...state, phase: 'scored', correct: null, guess: 'DECK_EMPTY' };
			const wordIndex = pickWordIndex(card);
			return {
				...state,
				phase: 'cluing',
				round: state.round + 1,
				guesserIndex: nextGuesserIndex,
				activeCard: card,
				activeWordIndex: wordIndex,
				secretWord: card.words[wordIndex],
				clues: {},
				eliminated: [],
				guess: null,
				correct: null,
				usedCards: [...state.usedCards, card.card]
			};
		}

		default:
			return state;
	}
}
