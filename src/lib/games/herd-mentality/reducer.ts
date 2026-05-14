import type { Action } from '$lib/engine/types';
import prompts from './prompts.json';

export interface HMData {
	phase: 'picking' | 'answering' | 'revealing';
	round: number;
	prompt: string | null;
	answers: Record<string, string>; // peerId -> answer
	majorityAnswer: string | null;
	/** Ordered list of peer IDs — set once when the game starts, used for rotation */
	playerOrder: string[];
	/** Index into playerOrder — whose turn it is to pick the prompt */
	pickerIndex: number;
}

export function reducer(data: unknown, action: Action): unknown {
	let state = data as HMData;
	if (!state) {
		state = { phase: 'picking', round: 1, prompt: null, answers: {}, majorityAnswer: null, playerOrder: [], pickerIndex: 0 };
	}

	const payload = action.payload;

	switch (payload.type) {
		case 'HM_INIT': {
			// Called on first round to seed the player rotation order
			const playerOrder = payload.playerOrder as string[];
			return {
				...state,
				playerOrder,
				pickerIndex: 0
			};
		}

		case 'HM_START_ROUND':
			return {
				...state,
				phase: 'answering',
				prompt: payload.prompt,
				answers: {},
				majorityAnswer: null
			};
		
		case 'HM_SUBMIT_ANSWER':
			return {
				...state,
				answers: {
					...state.answers,
					[action.senderId!]: payload.answer
				}
			};

		case 'HM_REVEAL':
			return {
				...state,
				phase: 'revealing',
				majorityAnswer: payload.majorityAnswer
			};

		case 'HM_NEXT_ROUND':
			return {
				...state,
				phase: 'picking',
				round: state.round + 1,
				prompt: null,
				answers: {},
				majorityAnswer: null,
				pickerIndex: (state.pickerIndex + 1) % Math.max(state.playerOrder.length, 1)
			};

		default:
			return state;
	}
}

export function getRandomPrompts(count: number): string[] {
	const shuffled = [...prompts].sort(() => 0.5 - Math.random());
	return shuffled.slice(0, count);
}
