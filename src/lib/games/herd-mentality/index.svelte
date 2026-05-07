<script lang="ts">
	import type { GameState, Action } from '$lib/engine/types';
	import { getRandomPrompts, type HMData } from './reducer';
	import { playPop, playDing } from '$lib/engine/sounds';

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
		playPop();
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
		playDing();
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

	function backToLobby() {
		onAction({ type: 'BACK_TO_LOBBY', payload: {} });
	}
</script>

<div class="herd-mentality-board">
	<header class="game-info-overlay">
		<span class="round-badge">Round {data.round}</span>
	</header>

	{#if data.phase === 'picking'}
		{#if isHost}
			<div class="picking-view" in:fade>
				<h3 class="table-label">Host: Pick a prompt</h3>
				<div class="prompts">
					{#each hostPrompts as p}
						<button class="paper-btn prompt-btn" onclick={() => pickPrompt(p)}>{p}</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="waiting-view" in:fade>
				<p>Waiting for the host to pick a prompt...</p>
			</div>
		{/if}

	{:else if data.phase === 'answering'}
		<div class="answering-view" in:fade>
			<div class="main-prompt">
				<h3 class="prompt-text">"{data.prompt}"</h3>
			</div>
			
			{#if hasSubmitted}
				<div class="waiting-view">
					<p>Answer submitted! 🐄</p>
					<div class="progress-bar">
						<div class="progress-fill" style:width="{(Object.keys(data.answers).length / players.length) * 100}%"></div>
					</div>
					<p class="progress-text">{Object.keys(data.answers).length} / {players.length} answered</p>
				</div>
			{:else}
				<div class="input-area">
					<input 
						type="text" 
						bind:value={myAnswer} 
						placeholder="Think like the herd..." 
						onkeydown={(e) => e.key === 'Enter' && submitAnswer()}
					/>
					<button class="btn-primary-cozy" onclick={submitAnswer}>Submit</button>
				</div>
			{/if}

			{#if isHost}
				<div class="host-panel">
					<button 
						class="btn-primary-cozy" 
						disabled={Object.keys(data.answers).length === 0}
						onclick={revealAnswers}
					>
						Reveal Answers
					</button>
				</div>
			{/if}
		</div>

	{:else if data.phase === 'revealing'}
		<div class="revealing-view" in:fade>
			<h3 class="prompt-text-small">"{data.prompt}"</h3>
			
			{#if data.majorityAnswer === null}
				<div class="no-herd">
					<p>No herd mentality! Everyone went rogue. 🚫🐄</p>
				</div>
			{:else}
				<div class="majority-reveal">
					<span class="label">The Herd said:</span>
					<span class="majority-text">{data.majorityAnswer}</span>
				</div>
			{/if}

			<div class="host-actions-overlay">
				{#if isHost}
					<button class="btn-primary-cozy" onclick={nextRound}>Next Round →</button>
					<button class="btn-ghost-cozy" onclick={backToLobby}>Lobby</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.herd-mentality-board {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		position: relative;
	}

	.game-info-overlay {
		position: absolute;
		top: -2rem;
		left: 50%;
		transform: translateX(-50%);
	}

	.round-badge {
		background: var(--accent);
		color: #fff;
		padding: 0.25rem 1rem;
		border-radius: 20px;
		font-weight: bold;
		font-size: 0.9rem;
		box-shadow: 0 4px 10px rgba(0,0,0,0.2);
	}

	.table-label {
		text-align: center;
		color: var(--primary);
		text-transform: uppercase;
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		margin-bottom: 1rem;
	}

	.main-prompt {
		background: #fff;
		padding: 2rem;
		border-radius: 4px;
		box-shadow: 0 10px 30px rgba(0,0,0,0.2), 0 2px 5px rgba(0,0,0,0.1);
		transform: rotate(-1deg);
		margin-bottom: 2rem;
		border: 1px solid #ddd;
	}

	.prompt-text {
		font-size: 2rem;
		color: #222;
		margin: 0;
		text-align: center;
		font-family: 'Comfortaa', sans-serif; /* Example cozy font */
	}

	.prompt-text-small {
		font-size: 1.2rem;
		color: rgba(0,0,0,0.4);
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.paper-btn {
		background: #fff;
		border: 1px solid #ddd;
		padding: 1rem 1.5rem;
		border-radius: 2px;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 6px rgba(0,0,0,0.05);
		color: #333;
		text-align: left;
	}

	.paper-btn:hover {
		transform: translateY(-2px) rotate(1deg);
		box-shadow: 0 8px 15px rgba(0,0,0,0.1);
		border-color: var(--accent);
	}

	.prompts {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 400px;
	}

	.input-area {
		display: flex;
		gap: 0.5rem;
		background: rgba(255,255,255,0.1);
		padding: 0.5rem;
		border-radius: 50px;
		border: 2px solid rgba(255,255,255,0.2);
	}

	.input-area input {
		background: transparent;
		border: none;
		padding: 0.75rem 1.5rem;
		color: #fff;
		font-size: 1.1rem;
		outline: none;
		width: 250px;
	}

	.btn-primary-cozy {
		background: var(--accent);
		color: #fff;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 50px;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary-cozy:hover {
		transform: scale(1.05);
		filter: brightness(1.1);
	}

	.progress-bar {
		width: 200px;
		height: 8px;
		background: rgba(255,255,255,0.1);
		border-radius: 4px;
		margin: 1rem 0;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--accent);
		transition: width 0.5s ease;
	}

	.progress-text {
		font-size: 0.8rem;
		opacity: 0.7;
	}

	.majority-reveal {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.majority-text {
		font-size: 3rem;
		font-weight: 900;
		text-transform: uppercase;
		color: var(--accent);
		text-shadow: 0 10px 20px rgba(0,0,0,0.2);
	}

	.label {
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		opacity: 0.6;
	}

	@keyframes pop-in {
		from { transform: scale(0.5); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}

	.host-actions-overlay {
		margin-top: 3rem;
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
</style>
