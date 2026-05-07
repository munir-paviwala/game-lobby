import type { Action } from '$lib/engine/types';
import prompts from './prompts.json';

export interface HMData {
	phase: 'picking' | 'answering' | 'revealing';
	round: number;
	prompt: string | null;
	answers: Record<string, string>; // peerId -> answer
	majorityAnswer: string | null;
}

export function reducer(data: unknown, action: Action): unknown {
	let state = data as HMData;
	if (!state) {
		state = { phase: 'picking', round: 1, prompt: null, answers: {}, majorityAnswer: null };
	}

	const payload = action.payload;

	switch (payload.type) {
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
				majorityAnswer: null
			};

		default:
			return state;
	}
}

export function getRandomPrompts(count: number): string[] {
	const shuffled = [...prompts].sort(() => 0.5 - Math.random());
	return shuffled.slice(0, count);
}
