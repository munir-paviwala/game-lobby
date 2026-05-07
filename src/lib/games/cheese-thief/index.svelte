<script lang="ts">
	import type { GameState, Action } from '$lib/engine/types';
	import type { CTData } from './reducer';

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
			votes: {}
		}
	);
	const players = $derived(Object.keys(gameState.players));

	// Phase: setup
	function assignRoles() {
		const roles: Record<string, 'thief' | 'sleepyhead'> = {};
		const shuffled = [...players].sort(() => Math.random() - 0.5);
		// 1 thief, rest sleepyheads
		roles[shuffled[0]] = 'thief';
		for (let i = 1; i < shuffled.length; i++) {
			roles[shuffled[i]] = 'sleepyhead';
		}
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_START_GAME', roles } });
	}

	// Phase: rolling
	let myDiceRoll = $state<number | null>(null);
	function rollDice() {
		const roll = Math.floor(Math.random() * 6) + 1;
		myDiceRoll = roll;
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_ROLL_DICE', diceValue: roll } });
	}
	const allRolled = $derived(Object.keys(data.dice).length === players.length);

	function beginNight() {
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_BEGIN_NIGHT' } });
	}

	// Phase: night
	function nextHour() {
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_NEXT_HOUR' } });
	}

	function stealCheese() {
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_STEAL_CHEESE' } });
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

		// Find thief
		const thiefId = Object.keys(data.roles).find((p) => data.roles[p] === 'thief');

		// Points logic
		const points: Record<string, number> = {};
		if (thiefId) {
			if (votedOut === thiefId) {
				// Sleepyheads win
				players.forEach((p) => {
					if (data.roles[p] === 'sleepyhead') points[p] = 1;
				});
			} else {
				// Thief wins (either tie, or someone else voted out)
				points[thiefId] = 2; // Thief gets 2 points for surviving
			}
			onAction({ type: 'ADD_POINTS', payload: { points } });
		}

		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_REVEAL' } });
	}

	function nextRound() {
		myDiceRoll = null;
		myVote = null;
		onAction({ type: 'GAME_ACTION', payload: { type: 'CT_NEXT_ROUND' } });
	}
</script>

<div class="cheese-thief card">
	<header class="game-header">
		<h2>🧀 Cheese Thief</h2>
	</header>

	{#if data.phase === 'setup'}
		<div class="center-content">
			<p>Host needs to assign roles...</p>
			{#if isHost}
				<button class="btn-primary mt" onclick={assignRoles}>Assign Roles</button>
			{/if}
		</div>
	{:else if data.phase === 'rolling'}
		<div class="center-content">
			<h3>Your Role: <span class="role">{data.roles[selfId]}</span></h3>
			{#if data.roles[selfId] === 'thief'}
				<p class="role-desc">You are the thief! You must steal the cheese during your wake hour.</p>
			{:else}
				<p class="role-desc">You are a sleepyhead. Try to find out who stole the cheese.</p>
			{/if}

			<div class="dice-section">
				{#if myDiceRoll}
					<div class="dice-result">You rolled a {myDiceRoll}</div>
				{:else}
					<button class="btn-primary" onclick={rollDice}>Roll Dice</button>
				{/if}
			</div>

			<p class="progress">{Object.keys(data.dice).length} / {players.length} rolled</p>

			{#if isHost}
				<button class="btn-primary mt" disabled={!allRolled} onclick={beginNight}>
					Begin Night Phase
				</button>
			{/if}
		</div>
	{:else if data.phase === 'night'}
		<div class="center-content night-mode">
			<h3 class="hour">Night Phase - Hour {data.currentHour}</h3>

			{#if data.sleepingPeers.includes(selfId)}
				<div class="sleep-status zzz">You are fast asleep... 💤</div>
			{:else}
				<div class="sleep-status awake">You are AWAKE! 👀</div>
				{#if data.roles[selfId] === 'thief'}
					<div class="thief-actions mt">
						{#if data.cheeseStolenBy}
							<p>🧀 Cheese secured!</p>
						{:else}
							<button class="btn-primary" onclick={stealCheese}>Steal the Cheese!</button>
						{/if}
					</div>
				{/if}
			{/if}

			{#if isHost}
				<div class="host-controls mt">
					<button class="btn-primary" onclick={nextHour}>
						{data.currentHour === 6 ? 'Wake Everyone Up ☀️' : 'Next Hour ➡️'}
					</button>
				</div>
			{/if}
		</div>
	{:else if data.phase === 'day'}
		<div class="center-content">
			<h3>☀️ Day Phase</h3>
			<p>Everyone is awake! The cheese is {#if data.cheeseStolenBy}<strong>MISSING!</strong>{:else}safe!{/if}</p>
			<p>Discuss who might have stolen it.</p>

			{#if isHost}
				<button class="btn-primary mt" onclick={beginVoting}>Begin Voting</button>
			{/if}
		</div>
	{:else if data.phase === 'voting'}
		<div class="center-content">
			<h3>Vote for the Thief!</h3>
			
			{#if data.votes[selfId]}
				<p>Waiting for others to vote...</p>
				<p class="progress">{Object.keys(data.votes).length} / {players.length} voted</p>
			{:else}
				<div class="vote-grid">
					{#each players as peerId}
						<button class="btn-ghost vote-btn" onclick={() => { myVote = peerId; submitVote(); }}>
							{gameState.players[peerId]?.name}
						</button>
					{/each}
				</div>
			{/if}

			{#if isHost}
				<button class="btn-primary mt" disabled={!allVoted} onclick={reveal}>
					Reveal Thief
				</button>
			{/if}
		</div>
	{:else if data.phase === 'reveal'}
		{@const thiefId = Object.keys(data.roles).find((p) => data.roles[p] === 'thief')}
		<div class="center-content">
			<h3>The Reveal!</h3>
			
			<p class="reveal-text">
				The thief was: <strong>{thiefId ? gameState.players[thiefId]?.name : 'No one'}</strong>
			</p>
			
			{#if !data.cheeseStolenBy}
				<p class="reveal-text">The thief forgot to steal the cheese!</p>
			{/if}

			{#if isHost}
				<button class="btn-primary mt" onclick={nextRound}>Next Round</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.cheese-thief {
		grid-column: 1 / -1;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		animation: fade-in 0.3s ease;
	}
	@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

	.game-header {
		text-align: center;
		border-bottom: 1px solid rgba(255,255,255,0.1);
		padding-bottom: 1rem;
	}
	.game-header h2 { font-size: 1.5rem; margin: 0; }

	.center-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 1rem;
	}

	.role {
		text-transform: uppercase;
		color: var(--color-accent-light);
		font-weight: bold;
	}

	.role-desc {
		color: var(--color-text-muted);
		max-width: 400px;
	}

	.dice-section {
		margin: 2rem 0;
		padding: 2rem;
		background: rgba(0,0,0,0.2);
		border-radius: var(--radius-lg);
		border: 1px solid rgba(255,255,255,0.1);
	}
	.dice-result {
		font-size: 2rem;
		font-weight: bold;
		color: #fff;
	}

	.progress { font-weight: bold; color: var(--color-text-muted); }

	.night-mode {
		background: rgba(10, 10, 30, 0.6);
		padding: 2rem;
		border-radius: var(--radius-lg);
		border: 1px solid rgba(100, 100, 255, 0.2);
	}
	.hour {
		font-size: 1.5rem;
		color: #a0a0ff;
	}
	.sleep-status {
		font-size: 1.5rem;
		margin: 2rem 0;
		padding: 1rem 2rem;
		border-radius: var(--radius-md);
		font-weight: bold;
	}
	.zzz {
		background: rgba(0, 0, 0, 0.5);
		color: #666;
	}
	.awake {
		background: rgba(255, 200, 50, 0.2);
		color: #ffcc33;
		box-shadow: 0 0 20px rgba(255, 200, 50, 0.2);
	}

	.vote-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		max-width: 300px;
	}
	.vote-btn {
		padding: 1rem;
		font-size: 1.1rem;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
	}

	.reveal-text {
		font-size: 1.2rem;
		color: #fff;
	}

	.mt { margin-top: 2rem; }
</style>
