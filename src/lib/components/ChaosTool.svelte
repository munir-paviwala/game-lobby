<script lang="ts">
	import { isHost } from '$lib/engine/session';
	import { gameState, applyAction } from '$lib/engine/stateStore';
	import { broadcastStateSync } from '$lib/engine/peer';
	import { getGame } from '$lib/games/registry';
	import type { Action } from '$lib/engine/types';

	let isVisible = $state(false);
	let botCount = $state(0);
	let isRunning = $state(false);
	let intervalId: any = null;

	function spawnBots(count: number) {
		for (let i = 0; i < count; i++) {
			const botId = `bot-${Math.random().toString(36).slice(2, 7)}`;
			const botName = `Bot ${i + 1}`;
			
			const newState = applyAction({
				type: 'PLAYER_JOIN',
				payload: {
					id: botId,
					name: botName,
					isHost: false,
					joinedAt: Date.now()
				}
			});
			broadcastStateSync(newState);
			botCount++;
		}
	}

	function startChaos() {
		if (!$isHost || isRunning) return;
		isRunning = true;
		
		intervalId = setInterval(() => {
			const state = $gameState;
			if (state.phase !== 'playing' || !state.game.id) return;
			
			const game = getGame(state.game.id);
			if (!game) return;

			// Pick a random bot
			const bots = Object.keys(state.players).filter(id => id.startsWith('bot-'));
			if (bots.length === 0) return;
			const botId = bots[Math.floor(Math.random() * bots.length)];

			// Perform a random action based on the game
			let action: Action | null = null;
			if (state.game.id === 'herd-mentality') {
				const data = state.game.data as any;
				if (data.phase === 'answering' && !data.answers[botId]) {
					action = {
						type: 'GAME_ACTION',
						payload: { type: 'HM_SUBMIT_ANSWER', answer: 'Moo!' }
					};
				}
			} else if (state.game.id === 'cheese-thief') {
				const data = state.game.data as any;
				if (data.phase === 'rolling' && !data.dice[botId]) {
					action = {
						type: 'GAME_ACTION',
						payload: { type: 'CT_ROLL_DICE', diceValue: Math.floor(Math.random() * 6) + 1 }
					};
				} else if (data.phase === 'voting' && !data.votes[botId]) {
					const players = Object.keys(state.players);
					action = {
						type: 'GAME_ACTION',
						payload: { type: 'CT_SUBMIT_VOTE', voteTarget: players[Math.floor(Math.random() * players.length)] }
					};
				}
			}

			if (action) {
				const newState = applyAction({ ...action, senderId: botId });
				broadcastStateSync(newState);
			}
		}, 500);
	}

	function stopChaos() {
		isRunning = false;
		if (intervalId) clearInterval(intervalId);
	}

	function clearBots() {
		stopChaos();
		const bots = Object.keys($gameState.players).filter(id => id.startsWith('bot-'));
		bots.forEach(botId => {
			const newState = applyAction({
				type: 'PLAYER_LEAVE',
				payload: { playerId: botId }
			});
			broadcastStateSync(newState);
		});
		botCount = 0;
	}
</script>

<div class="chaos-tool" class:visible={isVisible}>
	<button class="toggle-btn" onclick={() => isVisible = !isVisible}>
		{isVisible ? '✖' : '🛠️'}
	</button>

	{#if isVisible}
		<div class="panel">
			<h4>Chaos Mode (Debug)</h4>
			<div class="actions">
				<button class="btn-sm" onclick={() => spawnBots(1)}>+1 Bot</button>
				<button class="btn-sm" onclick={() => spawnBots(5)}>+5 Bots</button>
				<button class="btn-sm danger" onclick={clearBots}>Clear Bots</button>
			</div>
			
			<div class="status">
				Bots: {botCount} | Status: {isRunning ? '🔥 CHAOS' : 'Chillin'}
			</div>

			<div class="chaos-actions">
				{#if isRunning}
					<button class="btn-primary danger w-full" onclick={stopChaos}>STOP CHAOS</button>
				{:else}
					<button class="btn-primary w-full" onclick={startChaos}>START RANDOM ACTIONS</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.chaos-tool {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		z-index: 1000;
	}

	.toggle-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #333;
		color: #fff;
		border: 1px solid rgba(255,255,255,0.2);
		cursor: pointer;
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 10px rgba(0,0,0,0.3);
	}

	.panel {
		position: absolute;
		bottom: 50px;
		right: 0;
		width: 260px;
		background: #1a1a24;
		border: 1px solid #333;
		border-radius: 12px;
		padding: 1rem;
		box-shadow: 0 10px 30px rgba(0,0,0,0.5);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	h4 { margin: 0; font-size: 0.9rem; color: #aaa; text-transform: uppercase; }

	.actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
	.btn-sm { 
		padding: 0.25rem 0.5rem; 
		font-size: 0.75rem; 
		background: #333; 
		color: #fff; 
		border: 1px solid #444; 
		border-radius: 4px;
		cursor: pointer;
	}

	.status { font-size: 0.75rem; color: #888; border-top: 1px solid #222; padding-top: 0.5rem; }

	.danger { background: #642 !important; border-color: #832 !important; }
	
	.w-full { width: 100%; }

	.btn-primary {
		padding: 0.5rem;
		border-radius: 6px;
		border: none;
		background: #4f46e5;
		color: #fff;
		font-weight: bold;
		cursor: pointer;
	}
</style>
