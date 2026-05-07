import type { Action } from '$lib/engine/types';

export interface CTData {
	phase: 'setup' | 'rolling' | 'night' | 'day' | 'voting' | 'reveal';
	roles: Record<string, 'thief' | 'sleepyhead'>;
	dice: Record<string, number>;
	cheeseStolenBy: string | null;
	currentHour: number;
	sleepingPeers: string[];
	votes: Record<string, string>;
	peekTargets: Record<string, string>;
}

export function reducer(data: unknown, action: Action): unknown {
	let state = data as CTData;
	if (!state) {
		state = {
			phase: 'setup',
			roles: {},
			dice: {},
			cheeseStolenBy: null,
			currentHour: 0,
			sleepingPeers: [],
			votes: {},
			peekTargets: {}
		};
	}

	const payload = action.payload;

	switch (payload.type) {
		case 'CT_START_GAME': {
			return {
				...state,
				phase: 'rolling',
				roles: payload.roles, // host randomly assigns 1 thief, rest sleepyheads
				dice: {},
				cheeseStolenBy: null,
				currentHour: 0,
				sleepingPeers: [],
				votes: {}
			};
		}

		case 'CT_ROLL_DICE': {
			return {
				...state,
				dice: {
					...state.dice,
					[action.senderId!]: payload.diceValue
				}
			};
		}

		case 'CT_BEGIN_NIGHT': {
			const hour = 1;
			// Everyone sleeps unless their dice == hour
			const allPeers = Object.keys(state.roles);
			const sleepingPeers = allPeers.filter((id) => state.dice[id] !== hour);
			
			return {
				...state,
				phase: 'night',
				currentHour: hour,
				sleepingPeers
			};
		}

		case 'CT_NEXT_HOUR': {
			const nextHour = state.currentHour + 1;
			if (nextHour > 6) {
				return {
					...state,
					phase: 'day',
					currentHour: 0,
					sleepingPeers: []
				};
			} else {
				const allPeers = Object.keys(state.roles);
				const sleepingPeers = allPeers.filter((id) => state.dice[id] !== nextHour);
				return {
					...state,
					currentHour: nextHour,
					sleepingPeers
				};
			}
		}

		case 'CT_STEAL_CHEESE': {
			// Only thief can steal
			if (state.roles[action.senderId!] === 'thief') {
				return {
					...state,
					cheeseStolenBy: action.senderId!
				};
			}
			return state;
		}

		case 'CT_PEEK': {
			return {
				...state,
				peekTargets: {
					...state.peekTargets,
					[action.senderId!]: payload.targetId
				}
			};
		}

		case 'CT_BEGIN_VOTING': {
			return {
				...state,
				phase: 'voting'
			};
		}

		case 'CT_SUBMIT_VOTE': {
			return {
				...state,
				votes: {
					...state.votes,
					[action.senderId!]: payload.voteTarget
				}
			};
		}

		case 'CT_REVEAL': {
			return {
				...state,
				phase: 'reveal'
			};
		}

		case 'CT_NEXT_ROUND': {
			return {
				phase: 'setup',
				roles: {},
				dice: {},
				cheeseStolenBy: null,
				currentHour: 0,
				sleepingPeers: [],
				votes: {}
			};
		}

		default:
			return state;
	}
}
