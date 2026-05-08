<script lang="ts">
	import type { GameState, Action } from '$lib/engine/types';
	import { fade, scale } from 'svelte/transition';
	import type { CTData } from './reducer';
	import { playDice, playShhh, playDing } from '$lib/engine/sounds';

	interface Props {
		state: GameState;
		isHost: boolean;
		selfId: string;
		onAction: (action: Action) => void;
	}

	let { state: gameState, isHost, selfId, onAction }: Props = $props();

	const data = $derived(
		(gameState.game.data as CTData) || {
			phase: 'setup',
			roles: {},
			dice: {},
			cheeseStolenBy: null,
			currentHour: 0,
			sleepingPeers: [],
			votes: {},
			peekTargets: {}
		}
	);
	const players = $derived(Object.keys(gameState.players));

	// Phase: setup
	function assignRoles() {
		const roles: Record<string, 'thief' | 'sleepyhead' | 'fall mouse' | 'accomplice'> = {};
		const shuffled = [...players].sort(() => Math.random() - 0.5);
		
		// 1 thief
		roles[shuffled[0]] = 'thief';
		
		// 1 fall mouse if 5+ players
		let nextIdx = 1;
		if (players.length >= 5) {
			roles[shuffled[1]] = 'fall mouse';
			nextIdx = 2;
		}

		// rest sleepyheads
		for (let i = nextIdx; i < shuffled.length; i++) {
			roles[shuffled[i]] = 'sleepyhead';
		}
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_START_GAME', roles } });
	}

	const roleGoals = {
		'thief': 'Steal the cheese at your hour. In the morning, try to frame someone else. Win if you aren\'t voted out.',
		'sleepyhead': 'A simple mouse. Find the cheese thief! Win if the thief is caught.',
		'fall mouse': 'You win if you get voted out. Try to look suspicious enough to be identified as the thief!',
		'accomplice': 'You were tapped on the shoulder... Help the thief escape! You win if the thief wins.'
	};

	// Phase: rolling
	let myDiceRoll = $state<number | null>(null);
	function rollDice() {
		const roll = Math.floor(Math.random() * 6) + 1;
		myDiceRoll = roll;
		playDice();
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_ROLL_DICE', diceValue: roll } });
	}
	const allRolled = $derived(Object.keys(data.dice).length === players.length);

	function beginNight() {
		playShhh();
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_BEGIN_NIGHT' } });
	}

	// Phase: night
	function nextHour() {
		if (data.currentHour < 6) playShhh();
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_NEXT_HOUR' } });
	}

	function stealCheese() {
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_STEAL_CHEESE' } });
	}

	function peek(targetId: string) {
		if (data.peekTargets?.[selfId]) return;
		onAction({ type: 'ADD_POINTS', payload: { points: { [selfId]: 1 } } });
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_PEEK', targetId } });
	}

	function chooseAccomplice(targetId: string) {
		if (data.accompliceTarget) return;
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_CHOOSE_ACCOMPLICE', targetId } });
	}

	// Phase: day
	function beginVoting() {
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_BEGIN_VOTING' } });
	}

	// Phase: voting
	let myVote = $state<string | null>(null);
	function submitVote() {
		if (myVote) {
			onAction({ type: 'GAME_ACTION', payload: { type: 'CT_SUBMIT_VOTE', voteTarget: myVote } });
		}
	}
	const allVoted = $derived(Object.keys(data.votes).length === players.length);

	function reveal() {
		playDing();
		// Tally votes
		const counts: Record<string, number> = {};
		for (const target of Object.values(data.votes)) {
			counts[target] = (counts[target] || 0) + 1;
		}

		let max = 0;
		let votedOut: string | null = null;
		for (const [target, count] of Object.entries(counts)) {
			if (count > max) {
				max = count;
				votedOut = target;
			} else if (count === max) {
				votedOut = null; // tie
			}
		}

		// Roles
		const thiefId = Object.keys(data.roles).find((p) => data.roles[p] === 'thief');
		const fallMouseId = Object.keys(data.roles).find((p) => data.roles[p] === 'fall mouse');
		const accompliceId = data.accompliceTarget;

		// Points logic
		const points: Record<string, number> = {};
		
		// Fall Mouse condition: If voted out, Fall Mouse wins big
		if (fallMouseId && votedOut === fallMouseId) {
			points[fallMouseId] = 3;
		}

		// Thief / Sleepyhead condition
		if (thiefId) {
			if (votedOut === thiefId) {
				// Sleepyheads win
				players.forEach((p) => {
					if (data.roles[p] === 'sleepyhead' || data.roles[p] === 'fall mouse') {
						points[p] = (points[p] || 0) + 1;
					}
				});
			} else {
				// Thief & Accomplice win
				points[thiefId] = (points[thiefId] || 0) + 2;
				if (accompliceId) {
					points[accompliceId] = (points[accompliceId] || 0) + 2;
				}
			}
		}
		
		onAction({ type: 'ADD_POINTS', payload: { points } });
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_REVEAL' } });
	}

	function nextRound() {
		myDiceRoll = null;
		myVote = null;
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_NEXT_ROUND' } });
	}

	function backToLobby() {
		onAction({ type: 'BACK_TO_LOBBY', payload: {} });
	}
</script>

<div class="cheese-thief-board" class:is-night={data.phase === 'night'}>
	<header class="game-info-overlay">
		<span class="phase-badge">{data.phase} phase</span>
	</header>

	{#if data.phase === 'setup'}
		<div class="center-content">
			<p class="tavern-text">Waiting for the host to deal the roles...</p>
			{#if isHost}
				<button class="btn-primary-cozy" onclick={assignRoles}>Deal Roles</button>
			{/if}
		</div>
	{:else if data.phase === 'rolling'}
		<div class="center-content" in:fade>
			<div class="role-reveal">
				<span class="label">Your Secret Role</span>
				<h3 class="role-text">{data.roles[selfId]}</h3>
				<p class="role-goal">{roleGoals[data.roles[selfId]]}</p>
			</div>

			<div class="dice-area">
				{#if myDiceRoll}
					<div class="dice-visual" in:scale>
						{myDiceRoll}
					</div>
				{:else}
					<button class="roll-btn" onclick={rollDice}>Roll the Die 🎲</button>
				{/if}
			</div>

			<div class="progress-bubble">
				{Object.keys(data.dice).length} / {players.length} rolled
			</div>

			{#if isHost}
				<button class="btn-primary-cozy mt-4" disabled={!allRolled} onclick={beginNight}>
					Begin the Night
				</button>
			{/if}
		</div>
	{:else if data.phase === 'night'}
		<div class="center-content night-content" in:fade>
			<h3 class="hour-text">
				{data.currentHour === 7 ? "Thief's Secret Choice" : `Night Hour ${data.currentHour}`}
			</h3>

			{#if data.sleepingPeers.includes(selfId)}
				<div class="sleep-status zzz">
					{#if data.roles[selfId] === 'accomplice'}
						<p>A tap on your shoulder... 🤫</p>
						<p class="small">You are the ACCOMPLICE!</p>
					{:else}
						<p>💤 Fast asleep...</p>
					{/if}
				</div>
			{:else}
				<div class="sleep-status awake">
					<p>👁️ You are AWAKE!</p>
				</div>
				
				{@const awakePeers = players.filter(p => !data.sleepingPeers.includes(p))}
				{#if data.roles[selfId] === 'thief'}
					<div class="thief-actions mt-4">
						{#if data.currentHour === 7}
							<p class="label">Choose your Accomplice</p>
							{#if data.accompliceTarget}
								<p class="target-name">You picked {gameState.players[data.accompliceTarget]?.name}</p>
							{:else}
								<div class="choice-grid">
									{#each players.filter(p => p !== selfId) as p}
										<button class="choice-btn" onclick={() => chooseAccomplice(p)}>
											{gameState.players[p]?.name}
										</button>
									{/each}
								</div>
							{/if}
						{:else if data.cheeseStolenBy}
							<p class="success-text">🧀 Cheese secured!</p>
						{:else}
							<button class="btn-primary-cozy" onclick={stealCheese}>Steal the Cheese!</button>
						{/if}
					</div>
				{:else if awakePeers.length === 1}
					<div class="sleepyhead-actions mt-4">
						{#if data.peekTargets?.[selfId]}
							{@const targetId = data.peekTargets[selfId]}
							<div class="peek-result">
								<p class="label">You peeked at {gameState.players[targetId]?.name}</p>
								<p class="dice-val">They rolled a <strong>{data.dice[targetId]}</strong></p>
							</div>
						{:else}
							<p class="label">Peek at someone's roll</p>
							<div class="choice-grid">
								{#each players.filter(p => p !== selfId) as p}
									<button class="choice-btn" onclick={() => peek(p)}>
										{gameState.players[p]?.name}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/if}

			{#if isHost}
				<button class="btn-primary-cozy host-next-btn" onclick={nextHour}>
					{data.currentHour === 6 ? 'Morning Approaches ☀️' : 'Next Hour →'}
				</button>
			{/if}
		</div>
	{:else if data.phase === 'day'}
		<div class="center-content" in:fade>
			<h3 class="day-text">☀️ The Sun is Up</h3>
			<div class="cheese-status">
				{#if data.cheeseStolenBy}
					<span class="missing">THE CHEESE IS GONE! 🧀❓</span>
				{:else}
					<span class="safe">The cheese is safe. 🧀✅</span>
				{/if}
			</div>
			<p class="tavern-text">Discuss and find the thief.</p>

			{#if isHost}
				<button class="btn-primary-cozy mt-4" onclick={beginVoting}>Start Voting</button>
			{/if}
		</div>
	{:else if data.phase === 'voting'}
		<div class="center-content" in:fade>
			<h3 class="vote-label">Whom do you accuse?</h3>
			
			{#if data.votes[selfId]}
				<div class="waiting-view">
					<p>Accusation cast. Waiting for the mob...</p>
					<p class="progress-text">{Object.keys(data.votes).length} / {players.length} voted</p>
				</div>
			{:else}
				<div class="choice-grid-wide">
					{#each players as peerId}
						<button class="accuse-btn" onclick={() => { myVote = peerId; submitVote(); }}>
							{gameState.players[peerId]?.name}
						</button>
					{/each}
				</div>
			{/if}

			{#if isHost}
				<button class="btn-primary-cozy mt-4" disabled={!allVoted} onclick={reveal}>
					Reveal the Thief
				</button>
			{/if}
		</div>
	{:else if data.phase === 'reveal'}
		{@const thiefId = Object.keys(data.roles).find((p) => data.roles[p] === 'thief')}
		{@const fallMouseId = Object.keys(data.roles).find((p) => data.roles[p] === 'fall mouse')}
		{@const accompliceId = data.accompliceTarget}
		<div class="center-content" in:fade>
			<div class="reveal-result">
				<div class="result-card thief-card">
					<span class="label">The Thief was</span>
					<h3 class="name">{thiefId ? gameState.players[thiefId]?.name : 'No one'}</h3>
				</div>
				
				{#if accompliceId}
					<div class="accomplice-tag">Partner in crime: {gameState.players[accompliceId]?.name}</div>
				{/if}
			</div>

			<div class="summary-scroll">
				{#each players as pid}
					<div class="summary-line">
						<span class="p-name">{gameState.players[pid]?.name}</span>
						<span class="p-role tag-{data.roles[pid]}">{data.roles[pid]}</span>
						<span class="p-votes">{Object.values(data.votes).filter(v => v === pid).length} 🗳️</span>
					</div>
				{/each}
			</div>

			{#if isHost}
				<div class="host-actions-overlay">
					<button class="btn-primary-cozy" onclick={nextRound}>Next Round</button>
					<button class="btn-ghost-cozy" onclick={backToLobby}>Lobby</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.cheese-thief-board {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.game-info-overlay {
		position: absolute;
		top: -2rem;
		left: 50%;
		transform: translateX(-50%);
	}

	.phase-badge {
		background: var(--accent);
		color: #fff;
		padding: 0.25rem 1rem;
		border-radius: 20px;
		font-weight: bold;
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		box-shadow: 0 4px 10px rgba(0,0,0,0.2);
	}

	.center-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 1.5rem;
	}

	.tavern-text {
		color: var(--text-table);
		opacity: 0.8;
		font-style: italic;
	}

	.role-reveal {
		background: rgba(255,255,255,0.1);
		padding: 1.5rem 3rem;
		border-radius: 12px;
		border: 1px solid rgba(255,255,255,0.2);
	}

	.role-text {
		font-size: 2.5rem;
		margin: 0;
		color: var(--primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.dice-area {
		margin: 1rem 0;
	}

	.dice-visual {
		width: 80px;
		height: 80px;
		background: #fff;
		color: #333;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		font-weight: 900;
		border-radius: 12px;
		box-shadow: 0 10px 20px rgba(0,0,0,0.3), inset 0 -4px 0 rgba(0,0,0,0.1);
	}

	.roll-btn {
		background: #fff;
		color: #333;
		border: none;
		padding: 1rem 2rem;
		border-radius: 12px;
		font-size: 1.2rem;
		font-weight: bold;
		cursor: pointer;
		box-shadow: 0 8px 15px rgba(0,0,0,0.2);
		transition: transform 0.2s;
	}

	.roll-btn:hover { transform: translateY(-2px); }

	.progress-bubble {
		font-size: 0.8rem;
		opacity: 0.6;
		background: rgba(0,0,0,0.2);
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
	}

	.night-content {
		color: #a0a0ff;
	}

	.hour-text {
		font-size: 1.5rem;
		opacity: 0.7;
	}

	.sleep-status {
		padding: 2rem;
		border-radius: 20px;
		background: rgba(0,0,0,0.3);
		border: 1px solid rgba(100,100,255,0.2);
	}

	.sleep-status.awake {
		background: rgba(255,255,0,0.1);
		border-color: rgba(255,255,0,0.3);
		color: #fff;
		box-shadow: 0 0 30px rgba(255,255,0,0.1);
	}

	.choice-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.choice-btn {
		background: rgba(255,255,255,0.1);
		border: 1px solid rgba(255,255,255,0.2);
		color: #fff;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
	}

	.choice-btn:hover { background: var(--accent); }

	.btn-primary-cozy {
		background: var(--accent);
		color: #fff;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 50px;
		font-weight: bold;
		cursor: pointer;
	}

	.accuse-btn {
		background: #fff;
		color: #333;
		border: 1px solid #ddd;
		padding: 0.75rem 1.25rem;
		border-radius: 4px;
		font-weight: bold;
		cursor: pointer;
		box-shadow: 0 4px 6px rgba(0,0,0,0.1);
	}

	.accuse-btn:hover { background: #f0f0f0; border-color: var(--accent); }

	.choice-grid-wide {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: center;
		max-width: 500px;
	}

	.reveal-result {
		margin-bottom: 2rem;
	}

	.result-card {
		background: #fff;
		padding: 2rem 4rem;
		border-radius: 4px;
		box-shadow: 0 15px 40px rgba(0,0,0,0.3);
		transform: rotate(2deg);
	}

	.result-card .name { font-size: 2.5rem; color: #d32f2f; margin: 0; }
	.result-card .label { color: #888; text-transform: uppercase; font-size: 0.8rem; }

	.summary-scroll {
		background: rgba(0,0,0,0.2);
		padding: 1rem;
		border-radius: 8px;
		width: 100%;
		max-width: 400px;
	}

	.summary-line {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid rgba(255,255,255,0.05);
	}

	.p-name { flex: 1; text-align: left; }
	.p-role { font-size: 0.7rem; text-transform: uppercase; font-weight: bold; padding: 0.2rem 0.4rem; border-radius: 4px; }
	.tag-thief { background: #d32f2f; color: #fff; }
	.tag-fall-mouse { background: #fbc02d; color: #000; }
	.tag-accomplice { background: #1976d2; color: #fff; }
	.tag-sleepyhead { opacity: 0.5; }

	.host-actions-overlay {
		margin-top: 2rem;
		display: flex;
		gap: 1rem;
	}

	.btn-ghost-cozy {
		background: transparent;
		border: 2px solid rgba(255,255,255,0.2);
		color: #fff;
		padding: 0.75rem 1.5rem;
		border-radius: 50px;
		cursor: pointer;
	}

	.mt-4 { margin-top: 1rem; }
	.small { font-size: 0.8rem; opacity: 0.7; }
</style>
