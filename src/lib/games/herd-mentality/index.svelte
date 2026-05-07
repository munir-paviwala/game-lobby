<script lang="ts">
	import type { GameState, Action } from '$lib/engine/types';
	import { getRandomPrompts, type HMData } from './reducer';

	interface Props {
		state: GameState;
		isHost: boolean;
		selfId: string;
		onAction: (action: Action) => void;
	}

	let { state: gameState, isHost, selfId, onAction }: Props = $props();

	const data = $derived((gameState.game.data as HMData) || { phase: 'picking', round: 1, prompt: null, answers: {}, majorityAnswer: null });
	const players = $derived(Object.keys(gameState.players));

	// Host: Picking phase
	let hostPrompts = $state<string[]>([]);
	$effect(() => {
		if (isHost && data.phase === 'picking' && hostPrompts.length === 0) {
			hostPrompts = getRandomPrompts(3);
		}
	});

	function pickPrompt(prompt: string) {
		onAction({ type: 'GAME_ACTION', payload: { type: 'HM_START_ROUND', prompt } });
		hostPrompts = [];
	}

	// Client: Answering
	let myAnswer = $state('');
	let hasSubmitted = $derived(!!data.answers[selfId]);

	function submitAnswer() {
		if (!myAnswer.trim()) return;
		onAction({ type: 'GAME_ACTION', payload: { type: 'HM_SUBMIT_ANSWER', answer: myAnswer.trim() } });
	}

	// Host: Reveal
	function revealAnswers() {
		// Calculate majority
		const counts: Record<string, number> = {};
		for (const ans of Object.values(data.answers)) {
			const normalized = ans.toLowerCase().trim();
			counts[normalized] = (counts[normalized] || 0) + 1;
		}

		let max = 0;
		let majority: string | null = null;
		for (const [ans, count] of Object.entries(counts)) {
			if (count > max) {
				max = count;
				majority = ans;
			}
		}

		// It's possible there's a tie, but for simplicity we just take the first max.
		// If majority count is < 2, there is no herd!
		if (max < 2) {
			majority = null;
		}

		// Award points
		const points: Record<string, number> = {};
		if (majority !== null) {
			for (const [peerId, ans] of Object.entries(data.answers)) {
				if (ans.toLowerCase().trim() === majority) {
					points[peerId] = 1;
				}
			}
			onAction({ type: 'ADD_POINTS', payload: { points } });
		}

		onAction({ type: 'GAME_ACTION', payload: { type: 'HM_REVEAL', majorityAnswer: majority } });
	}

	function nextRound() {
		myAnswer = '';
		onAction({ type: 'GAME_ACTION', payload: { type: 'HM_NEXT_ROUND' } });
	}
</script>

<div class="herd-mentality card">
	<header class="game-header">
		<h2>🐄 Herd Mentality</h2>
		<span class="round">Round {data.round}</span>
	</header>

	{#if data.phase === 'picking'}
		{#if isHost}
			<div class="picking-view">
				<h3>Pick a prompt for this round:</h3>
				<div class="prompts">
					{#each hostPrompts as p}
						<button class="btn-ghost prompt-btn" onclick={() => pickPrompt(p)}>{p}</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="waiting-view">
				<p>Waiting for the host to pick a prompt...</p>
			</div>
		{/if}

	{:else if data.phase === 'answering'}
		<div class="answering-view">
			<h3 class="prompt-text">"{data.prompt}"</h3>
			
			{#if hasSubmitted}
				<div class="waiting-view">
					<p>Answer submitted! Waiting for others...</p>
					<p class="progress">{Object.keys(data.answers).length} / {players.length} answered</p>
				</div>
			{:else}
				<div class="input-row">
					<input 
						type="text" 
						bind:value={myAnswer} 
						placeholder="Think like the herd..." 
						onkeydown={(e) => e.key === 'Enter' && submitAnswer()}
					/>
					<button class="btn-primary" onclick={submitAnswer}>Submit</button>
				</div>
			{/if}

			{#if isHost}
				<div class="host-panel">
					<p>{Object.keys(data.answers).length} of {players.length} players have answered.</p>
					<button 
						class="btn-primary" 
						disabled={Object.keys(data.answers).length === 0}
						onclick={revealAnswers}
					>
						Reveal Answers
					</button>
				</div>
			{/if}
		</div>

	{:else if data.phase === 'revealing'}
		<div class="revealing-view">
			<h3 class="prompt-text">"{data.prompt}"</h3>
			
			{#if data.majorityAnswer === null}
				<div class="no-herd">
					<p>No herd mentality this round! Everyone answered differently.</p>
				</div>
			{/if}

			<div class="answers-grid">
				{#each players as peerId}
					{@const ans = data.answers[peerId] || 'No answer'}
					{@const isMajority = data.majorityAnswer !== null && ans.toLowerCase().trim() === data.majorityAnswer}
					<div class="answer-card" class:is-majority={isMajority}>
						<div class="player-name">{gameState.players[peerId]?.name}</div>
						<div class="answer">{ans}</div>
						{#if isMajority}
							<div class="points">+1</div>
						{/if}
					</div>
				{/each}
			</div>

			{#if isHost}
				<div class="host-panel mt-4">
					<button class="btn-primary" onclick={nextRound}>Next Round →</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.herd-mentality {
		grid-column: 1 / -1;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		animation: fade-in 0.3s ease;
	}
	@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

	.game-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid rgba(255,255,255,0.1);
		padding-bottom: 1rem;
	}
	.game-header h2 { font-size: 1.5rem; margin: 0; }
	.round { color: var(--color-accent-light); font-weight: bold; }
	
	.prompt-text {
		font-size: 1.8rem;
		text-align: center;
		margin-bottom: 2rem;
		color: #fff;
		font-weight: 500;
	}

	.prompts {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1.5rem;
	}
	.prompt-btn {
		text-align: left;
		padding: 1.25rem;
		font-size: 1.1rem;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: var(--radius-md);
		transition: all 0.2s ease;
		cursor: pointer;
		color: var(--color-text);
	}
	.prompt-btn:hover {
		background: rgba(255,255,255,0.1);
		border-color: var(--color-accent);
		transform: translateX(4px);
	}

	.input-row {
		display: flex;
		gap: 1rem;
		max-width: 500px;
		margin: 0 auto;
	}
	.input-row input {
		flex: 1;
		padding: 0.8rem 1rem;
		border-radius: var(--radius-sm);
		border: 1px solid rgba(255,255,255,0.2);
		background: rgba(0,0,0,0.2);
		color: #fff;
		font-size: 1.1rem;
		outline: none;
	}
	.input-row input:focus {
		border-color: var(--color-accent);
	}

	.waiting-view {
		text-align: center;
		color: var(--color-text-muted);
		padding: 2rem;
		background: rgba(0,0,0,0.1);
		border-radius: var(--radius-md);
	}
	.progress { margin-top: 0.5rem; font-weight: bold; color: #fff; }

	.host-panel {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px dashed rgba(255,255,255,0.2);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.no-herd {
		text-align: center;
		color: var(--color-error);
		margin-bottom: 2rem;
		font-weight: bold;
		font-size: 1.2rem;
	}

	.answers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}
	.answer-card {
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		padding: 1.5rem;
		border-radius: var(--radius-md);
		position: relative;
		text-align: center;
		transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}
	.answer-card.is-majority {
		background: rgba(45, 212, 161, 0.15);
		border-color: var(--color-success);
		transform: scale(1.05);
		z-index: 2;
	}
	.player-name {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin-bottom: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.answer {
		font-size: 1.4rem;
		font-weight: bold;
		color: #fff;
	}
	.points {
		position: absolute;
		top: -0.75rem;
		right: -0.75rem;
		background: var(--color-success);
		color: #000;
		font-weight: bold;
		padding: 0.3rem 0.6rem;
		border-radius: 12px;
		font-size: 0.9rem;
		box-shadow: 0 4px 12px rgba(45, 212, 161, 0.3);
	}
	.mt-4 { margin-top: 2rem; }
</style>
