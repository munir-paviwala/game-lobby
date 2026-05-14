<script lang="ts">
	import type { GameState, Action } from '$lib/engine/types';
	import { fade } from 'svelte/transition';
	import { getRandomPrompts, type HMData } from './reducer';
	import { playPop, playDing } from '$lib/engine/sounds';

	interface Props {
		state: GameState;
		isHost: boolean;
		selfId: string;
		onAction: (action: Action) => void;
	}

	let { state: gameState, isHost, selfId, onAction }: Props = $props();

	const data = $derived((gameState.game.data as HMData) || { phase: 'picking', round: 1, prompt: null, answers: {}, majorityAnswer: null, playerOrder: [], pickerIndex: 0 });
	const players = $derived(Object.keys(gameState.players));

	// ─── Rotating Picker ──────────────────────────────────────────────────────
	// Seed the player order on first load (host only, once per game)
	let hasInited = $state(false);
	$effect(() => {
		if (isHost && !hasInited && data.phase === 'picking' && data.playerOrder.length === 0 && players.length > 0) {
			hasInited = true;
			onAction({ type: 'GAME_ACTION', payload: { type: 'HM_INIT', playerOrder: [...players] } });
		}
	});

	const currentPickerId = $derived(
		data.playerOrder.length > 0
			? data.playerOrder[data.pickerIndex % data.playerOrder.length]
			: players[0] ?? ''
	);
	const currentPickerName = $derived(gameState.players[currentPickerId]?.name ?? 'Someone');
	const iAmPicker = $derived(selfId === currentPickerId);

	// Prompt options — only generated for the picker
	let localPrompts = $state<string[]>([]);
	$effect(() => {
		if (data.phase === 'picking' && iAmPicker && localPrompts.length === 0) {
			localPrompts = getRandomPrompts(3);
		}
		if (data.phase !== 'picking') {
			localPrompts = [];
		}
	});

	function pickPrompt(prompt: string) {
		playPop();
		onAction({ type: 'GAME_ACTION', payload: { type: 'HM_START_ROUND', prompt } });
		localPrompts = [];
	}

	// Client: Answering
	let myAnswer = $state('');
	let hasSubmitted = $derived(!!data.answers[selfId]);

	function submitAnswer() {
		if (!myAnswer.trim()) return;
		onAction({ type: 'GAME_ACTION', payload: { type: 'HM_SUBMIT_ANSWER', answer: myAnswer.trim() } });
	}

	// Reveal (any player can trigger — democratized)
	function revealAnswers() {
		playDing();
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

		if (max < 2) majority = null;

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
		<div class="picking-view" in:fade>
			{#if iAmPicker}
				<h3 class="table-label">✨ Your turn — pick a prompt!</h3>
				<div class="prompts">
					{#each localPrompts as p}
						<button class="paper-btn prompt-btn" onclick={() => pickPrompt(p)}>{p}</button>
					{/each}
				</div>
			{:else}
				<div class="waiting-for-picker">
					<div class="picker-avatar">{currentPickerName.charAt(0).toUpperCase()}</div>
					<p class="picker-name-label"><strong>{currentPickerName}</strong> is picking a prompt…</p>
					<div class="picker-dots">
						<span></span><span></span><span></span>
					</div>
				</div>
			{/if}
		</div>

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

			<div class="host-panel">
				<button 
					class="btn-primary-cozy" 
					disabled={Object.keys(data.answers).length === 0}
					onclick={revealAnswers}
				>
					Reveal Answers
				</button>
			</div>
		</div>

	{:else if data.phase === 'revealing'}
		<div class="revealing-view animate-in" in:fade>
			<div class="revealing-header">
				<h3 class="prompt-text-small">"{data.prompt}"</h3>
				{#if data.majorityAnswer !== null}
					<div class="majority-announcement">
						<span class="label">The Herd said:</span>
						<span class="majority-text">{data.majorityAnswer}</span>
					</div>
				{:else}
					<div class="no-herd glass">
						<p>No herd mentality! Everyone went rogue. 🚫🐄</p>
					</div>
				{/if}
			</div>
			
			<div class="answers-grid">
				{#each players as pId}
					{@const answer = data.answers[pId] || 'No Answer'}
					{@const isMajority = answer.toLowerCase().trim() === data.majorityAnswer}
					<div class="answer-card glass" class:is-majority={isMajority}>
						<div class="player-name">{gameState.players[pId]?.name || 'Unknown'}</div>
						<div class="player-answer">"{answer}"</div>
						
						{#if isHost}
							<div class="host-score-controls">
								<button class="score-btn minus" onclick={() => onAction({ type: 'ADD_POINTS', payload: { points: { [pId]: -1 } } })} title="Subtract point">−</button>
								<span class="current-score">{gameState.scores[pId] ?? 0}</span>
								<button class="score-btn plus" onclick={() => onAction({ type: 'ADD_POINTS', payload: { points: { [pId]: 1 } } })} title="Add point">+</button>
							</div>
						{:else}
							<div class="score-display">
								{gameState.scores[pId] ?? 0} pts
							</div>
						{/if}
						
						{#if isMajority}
							<div class="majority-badge">🐄</div>
						{/if}
					</div>
				{/each}
			</div>

			<div class="host-actions-overlay">
				<button class="btn-primary-cozy" onclick={nextRound}>Next Round →</button>
				{#if isHost}
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

	.waiting-for-picker {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
	}

	.picker-avatar {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-size: 1.8rem;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8px 20px rgba(0,0,0,0.15);
	}

	.picker-name-label {
		font-size: 1rem;
		color: var(--primary);
		text-align: center;
	}

	.picker-dots {
		display: flex;
		gap: 6px;
	}

	.picker-dots span {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
		animation: dot-pulse 1.2s infinite ease-in-out;
	}

	.picker-dots span:nth-child(2) { animation-delay: 0.2s; }
	.picker-dots span:nth-child(3) { animation-delay: 0.4s; }

	@keyframes dot-pulse {
		0%, 100% { opacity: 0.3; transform: scale(0.8); }
		50% { opacity: 1; transform: scale(1); }
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
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		background: rgba(255,255,255,0.1);
		padding: 0.5rem;
		border-radius: 50px;
		border: 2px solid rgba(255,255,255,0.2);
		width: 100%;
		max-width: 400px;
	}

	.input-area input {
		background: transparent;
		border: none;
		padding: 0.75rem 1.5rem;
		color: #fff;
		font-size: 1.1rem;
		outline: none;
		flex: 1;
		min-width: 150px;
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

	.revealing-view {
		width: 100%;
		max-width: 800px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	.revealing-header {
		text-align: center;
	}

	.majority-announcement {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		animation: pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.answers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1rem;
		width: 100%;
		margin-top: 1rem;
	}

	.answer-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		position: relative;
		transition: all 0.3s ease;
	}

	.answer-card.is-majority {
		background: rgba(124, 106, 247, 0.15);
		border-color: var(--accent);
		transform: scale(1.05);
		box-shadow: 0 10px 20px rgba(0,0,0,0.2);
	}

	.player-name {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.5);
		margin-bottom: 0.5rem;
	}

	.player-answer {
		font-size: 1.25rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 1rem;
		word-break: break-word;
	}

	.host-score-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: rgba(0, 0, 0, 0.3);
		padding: 0.25rem 0.5rem;
		border-radius: 20px;
	}

	.score-btn {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		transition: all 0.2s ease;
	}

	.score-btn:hover {
		background: var(--accent);
	}

	.score-btn.minus:hover {
		background: #f06060;
	}

	.current-score {
		font-size: 0.9rem;
		font-weight: 700;
		min-width: 1.5rem;
	}

	.score-display {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--accent);
	}

	.majority-badge {
		position: absolute;
		top: -10px;
		right: -10px;
		background: var(--accent);
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		font-size: 1.1rem;
		box-shadow: 0 4px 8px rgba(0,0,0,0.3);
		animation: bounce 2s infinite;
	}

	@keyframes bounce {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-5px); }
	}

	.majority-reveal {
		display: none; /* Replaced by announcement */
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

	@media (max-width: 600px) {
		.prompt-text {
			font-size: 1.5rem;
		}
		.main-prompt {
			padding: 1rem;
		}
		.answers-grid {
			grid-template-columns: 1fr;
		}
		.input-area {
			border-radius: 20px;
		}
		.btn-primary-cozy, .btn-ghost-cozy {
			width: 100%;
		}
		.host-actions-overlay {
			flex-direction: column;
			width: 100%;
		}
	}
</style>
