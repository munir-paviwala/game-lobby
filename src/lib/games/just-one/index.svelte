<script lang="ts">
	import type { GameState, Action } from '$lib/engine/types';
	import { fade } from 'svelte/transition';
	import type { JOData } from './reducer';
	import { playPop, playDing } from '$lib/engine/sounds';

	interface Props {
		state: GameState;
		isHost: boolean;
		selfId: string;
		onAction: (action: Action) => void;
	}

	let { state: gameState, isHost, selfId, onAction }: Props = $props();

	const data = $derived((gameState.game.data as JOData) || { 
		phase: 'waiting', round: 1, playerOrder: [], guesserIndex: 0, 
		activeCard: null, activeWordIndex: 0, secretWord: null, 
		clues: {}, eliminated: [], guess: null, correct: null, usedCards: [] 
	});
	const players = $derived(Object.keys(gameState.players));

	let hasInited = $state(false);
	$effect(() => {
		if (isHost && !hasInited && data.phase === 'waiting' && data.playerOrder.length === 0 && players.length > 0) {
			hasInited = true;
			onAction({ type: 'GAME_ACTION', payload: { type: 'JO_INIT', playerOrder: [...players] } });
		}
	});

	const currentGuesserId = $derived(
		data.playerOrder.length > 0
			? data.playerOrder[data.guesserIndex % data.playerOrder.length]
			: players[0] ?? ''
	);
	const currentGuesserName = $derived(gameState.players[currentGuesserId]?.name ?? 'Someone');
	const iAmGuesser = $derived(selfId === currentGuesserId);

	// Cluing phase
	let myClue = $state('');
	let hasSubmittedClue = $derived(!!data.clues[selfId]);

	function submitClue() {
		if (!myClue.trim()) return;
		playPop();
		onAction({ type: 'GAME_ACTION', payload: { type: 'JO_SUBMIT_CLUE', clue: myClue.trim() } });
	}

	// Eliminating phase
	let localEliminated = $state<Set<string>>(new Set());
	
	$effect(() => {
		if (data.phase === 'eliminating') {
			localEliminated = new Set(data.eliminated || []);
		}
	});

	function toggleEliminate(peerId: string) {
		if (!isHost) return;
		const next = new Set(localEliminated);
		if (next.has(peerId)) next.delete(peerId);
		else next.add(peerId);
		localEliminated = next;
	}

	function confirmEliminations() {
		if (!isHost) return;
		playDing();
		onAction({ type: 'GAME_ACTION', payload: { type: 'JO_ELIMINATE', eliminated: Array.from(localEliminated) } });
	}
	
	function autoEliminate() {
		const counts: Record<string, string[]> = {};
		for (const [peerId, clue] of Object.entries(data.clues)) {
			const norm = clue.trim().toLowerCase();
			if (!counts[norm]) counts[norm] = [];
			counts[norm].push(peerId);
		}
		const toEliminate = new Set<string>();
		for (const ids of Object.values(counts)) {
			if (ids.length > 1) {
				for (const id of ids) toEliminate.add(id);
			}
		}
		localEliminated = toEliminate;
	}

	function goToElimination() {
		if (isHost) {
			onAction({ type: 'GAME_ACTION', payload: { type: 'JO_ELIMINATE', eliminated: [] } });
			// The reducer actually doesn't have a phase transition to 'eliminating' via JO_ELIMINATE initially?
			// Wait, the reducer handles JO_ELIMINATE by jumping to 'guessing'.
			// We need an action to transition from 'cluing' to 'eliminating'.
		}
	}
	
	// Wait, we need an action to start elimination
	function startElimination() {
		onAction({ type: 'GAME_ACTION', payload: { type: 'JO_START_ELIMINATION' } });
	}

	// Guessing phase
	let myGuess = $state('');
	
	function submitGuess() {
		if (!myGuess.trim()) return;
		playDing();
		onAction({ type: 'GAME_ACTION', payload: { type: 'JO_SUBMIT_GUESS', guess: myGuess.trim() } });
		
		// Auto-award point if correct
		const correct = myGuess.trim().toUpperCase() === (data.secretWord ?? '').toUpperCase();
		if (correct) {
			// Everyone gets a point (co-op)
			const points: Record<string, number> = {};
			for (const p of players) points[p] = 1;
			onAction({ type: 'ADD_POINTS', payload: { points } });
		}
	}

	// Scoring phase
	function nextRound() {
		myClue = '';
		myGuess = '';
		localEliminated = new Set();
		onAction({ type: 'GAME_ACTION', payload: { type: 'JO_NEXT_ROUND' } });
	}

	function backToLobby() {
		onAction({ type: 'BACK_TO_LOBBY', payload: {} });
	}
	
	const otherPlayersCount = $derived(players.length - 1);
	const submittedCluesCount = $derived(Object.keys(data.clues).length);
</script>

<div class="jo-board">
	<header class="game-info-overlay">
		<span class="round-badge">Round {data.round}</span>
	</header>

	{#if data.phase === 'cluing'}
		<div class="cluing-view" in:fade>
			{#if iAmGuesser}
				<div class="waiting-view">
					<h3>You are the guesser!</h3>
					<p>Close your eyes while others write clues for the secret word.</p>
					<div class="progress-bar">
						<div class="progress-fill" style:width="{(submittedCluesCount / Math.max(otherPlayersCount, 1)) * 100}%"></div>
					</div>
					<p>{submittedCluesCount} / {otherPlayersCount} clues submitted</p>
				</div>
			{:else}
				<div class="card-view">
					<h3 class="secret-word">{data.secretWord}</h3>
					<p class="subtitle">Write exactly ONE word as a clue.</p>
				</div>
				{#if hasSubmittedClue}
					<div class="waiting-view">
						<p>Clue submitted! Waiting for others...</p>
						<p>{submittedCluesCount} / {otherPlayersCount} clues submitted</p>
					</div>
				{:else}
					<div class="input-area">
						<input 
							type="text" 
							bind:value={myClue} 
							placeholder="Your clue..." 
							onkeydown={(e) => e.key === 'Enter' && submitClue()}
						/>
						<button class="btn-primary-cozy" onclick={submitClue}>Submit</button>
					</div>
				{/if}
			{/if}
			
			{#if isHost && submittedCluesCount > 0}
				<div class="host-panel">
					<button class="btn-primary-cozy" onclick={startElimination}>Review Clues</button>
				</div>
			{/if}
		</div>

	{:else if data.phase === 'eliminating'}
		<div class="eliminating-view" in:fade>
			{#if iAmGuesser}
				<div class="waiting-view">
					<h3>Checking for duplicates...</h3>
					<p>The host is reviewing the clues. If two people wrote the same word, those clues will be cancelled!</p>
				</div>
			{:else}
				<h3>Review Clues</h3>
				<p>Duplicates are cancelled. Click a clue to toggle its elimination status.</p>
				
				{#if isHost}
					<button class="btn-ghost-cozy" onclick={autoEliminate}>Auto-Find Duplicates</button>
				{/if}

				<div class="clues-grid">
					{#each Object.entries(data.clues) as [peerId, clue]}
						<button 
							class="clue-card" 
							class:eliminated={localEliminated.has(peerId)}
							onclick={() => toggleEliminate(peerId)}
							disabled={!isHost}
						>
							<span class="clue-text">{clue}</span>
							<span class="clue-author">{gameState.players[peerId]?.name || 'Unknown'}</span>
						</button>
					{/each}
				</div>

				{#if isHost}
					<div class="host-actions-overlay">
						<button class="btn-primary-cozy" onclick={confirmEliminations}>Confirm & Guess</button>
					</div>
				{/if}
			{/if}
		</div>

	{:else if data.phase === 'guessing'}
		<div class="guessing-view" in:fade>
			<h3>The clues are...</h3>
			<div class="clues-grid">
				{#each Object.entries(data.clues) as [peerId, clue]}
					<div class="clue-card" class:eliminated={data.eliminated.includes(peerId)}>
						{#if data.eliminated.includes(peerId)}
							<span class="clue-text cancelled">Cancelled</span>
						{:else}
							<span class="clue-text">{clue}</span>
						{/if}
						<span class="clue-author">{gameState.players[peerId]?.name || 'Unknown'}</span>
					</div>
				{/each}
			</div>

			{#if iAmGuesser}
				<div class="input-area mt-4">
					<input 
						type="text" 
						bind:value={myGuess} 
						placeholder="What is the secret word?" 
						onkeydown={(e) => e.key === 'Enter' && submitGuess()}
					/>
					<button class="btn-primary-cozy" onclick={submitGuess}>Guess!</button>
				</div>
			{:else}
				<div class="waiting-view mt-4">
					<p>Waiting for <strong>{currentGuesserName}</strong> to guess...</p>
				</div>
			{/if}
		</div>

	{:else if data.phase === 'scored'}
		<div class="scored-view animate-in" in:fade>
			<div class="result-banner" class:correct={data.correct} class:wrong={!data.correct}>
				{#if data.correct}
					<h2>🎉 Correct! 🎉</h2>
					<p>The word was <strong>{data.secretWord}</strong></p>
				{:else}
					<h2>❌ Wrong!</h2>
					<p>The word was <strong>{data.secretWord}</strong></p>
					<p>They guessed: <em>{data.guess}</em></p>
				{/if}
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
	.jo-board {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		position: relative;
		text-align: center;
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

	.cluing-view, .eliminating-view, .guessing-view, .scored-view {
		width: 100%;
		max-width: 600px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.card-view {
		background: #fff;
		padding: 2rem 3rem;
		border-radius: 8px;
		box-shadow: 0 10px 30px rgba(0,0,0,0.1);
		border: 1px solid #ddd;
		transform: rotate(-1deg);
		margin-bottom: 1rem;
	}

	.secret-word {
		font-size: 2.5rem;
		color: #222;
		margin: 0 0 0.5rem 0;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.subtitle {
		color: #666;
		margin: 0;
		font-size: 0.9rem;
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

	.btn-primary-cozy:hover:not(:disabled) {
		transform: scale(1.05);
		filter: brightness(1.1);
	}
	
	.btn-primary-cozy:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-ghost-cozy {
		background: transparent;
		border: 2px solid rgba(255,255,255,0.2);
		color: #fff;
		padding: 0.75rem 1.5rem;
		border-radius: 50px;
		cursor: pointer;
	}

	.waiting-view {
		padding: 2rem;
		background: rgba(0,0,0,0.2);
		border-radius: 12px;
		width: 100%;
	}

	.progress-bar {
		width: 100%;
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

	.clues-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 1rem;
		width: 100%;
	}

	.clue-card {
		background: rgba(255, 255, 255, 0.9);
		border: 2px solid transparent;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		color: #222;
		cursor: default;
		transition: all 0.2s ease;
		box-shadow: 0 4px 10px rgba(0,0,0,0.1);
	}

	button.clue-card {
		cursor: pointer;
	}

	button.clue-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 15px rgba(0,0,0,0.15);
	}

	.clue-card.eliminated {
		background: rgba(255, 255, 255, 0.4);
		text-decoration: line-through;
		opacity: 0.7;
		border-color: rgba(240, 96, 96, 0.5);
	}

	.clue-text {
		font-size: 1.25rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
		word-break: break-word;
	}
	
	.clue-text.cancelled {
		color: #f06060;
		font-size: 1rem;
		text-decoration: none;
	}

	.clue-author {
		font-size: 0.75rem;
		text-transform: uppercase;
		opacity: 0.6;
	}

	.result-banner {
		padding: 2rem;
		border-radius: 12px;
		background: rgba(0,0,0,0.4);
		width: 100%;
	}

	.result-banner.correct h2 {
		color: #4CAF50;
	}

	.result-banner.wrong h2 {
		color: #f06060;
	}

	.host-actions-overlay {
		margin-top: 1rem;
		display: flex;
		gap: 1rem;
		justify-content: center;
	}
	
	.mt-4 { margin-top: 1.5rem; }
</style>
