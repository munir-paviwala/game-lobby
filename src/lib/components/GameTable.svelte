<script lang="ts">
	import type { GameState, Player, GameTheme } from '$lib/engine/types';
	import { getGame } from '$lib/games/registry';
	import VideoTile from './VideoTile.svelte';

	interface Props {
		state: GameState;
		selfId: string;
		remoteStreams: Map<string, { stream: MediaStream, status: 'connecting' | 'live' }>;
		localStream: MediaStream | null;
		children?: any;
	}

	let { state, selfId, remoteStreams, localStream, children }: Props = $props();

	const gameModule = $derived(state.game.id ? getGame(state.game.id) : null);
	const theme = $derived(gameModule?.theme || {
		primary: '#6366f1',
		secondary: '#818cf8',
		accent: '#f43f5e',
		background: '#0f172a',
		text: '#f8fafc'
	});

	const players = $derived(Object.values(state.players).sort((a, b) => a.joinedAt - b.joinedAt));
	
	function getPosition(index: number, total: number) {
		if (total === 0) return { x: 50, y: 50 };
		const angle = (index / total) * 2 * Math.PI + (Math.PI / 2);
		const a = 44; 
		const b = 38;
		return { x: 50 + a * Math.cos(angle), y: 50 + b * Math.sin(angle) };
	}

	const positions = $derived(players.map((_, i) => getPosition(i, players.length)));

	function isAsleep(peerId: string): boolean {
		if (state.phase !== 'playing') return false;
		const data = state.game.data as any;
		return data?.sleepingPeers?.includes(peerId) ?? false;
	}
</script>

<div 
	class="game-table" 
	style:--primary={theme.primary}
	style:--secondary={theme.secondary}
	style:--accent={theme.accent}
	style:--bg-table={theme.background}
	style:--text-table={theme.text}
>
	<div class="table-surface">
		<div class="inner-shadow"></div>
		<div class="game-content">
			{@render children?.()}
		</div>
	</div>

	{#each players as player, i (player.id)}
		{@const pos = positions[i]}
		{@const stream = player.id === selfId ? localStream : remoteStreams.get(player.id)?.stream || null}
		<div 
			class="player-seat" 
			class:is-self={player.id === selfId}
			style:left="{pos.x}%"
			style:top="{pos.y}%"
		>
			<div class="seat-wrapper">
				<div class="video-tile-container">
					<VideoTile 
						{stream} 
						peerId={player.id} 
						isSelf={player.id === selfId} 
						isAsleep={isAsleep(player.id)} 
						name={player.name} 
					/>
				</div>
				<div class="player-info-bubble">
					<span class="score">{state.scores[player.id] ?? 0} pts</span>
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.game-table {
		position: relative;
		width: 100%;
		height: 85vh;
		max-height: 900px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
	}

	.table-surface {
		position: relative;
		width: 75%;
		height: 65%;
		background: var(--bg-table);
		border-radius: 200px / 140px;
		box-shadow: 
			0 30px 60px rgba(0,0,0,0.5),
			inset 0 0 50px rgba(0,0,0,0.3);
		border: 10px solid rgba(255,255,255,0.08);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
		z-index: 1;
	}

	.inner-shadow {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		box-shadow: inset 0 2px 20px rgba(255,255,255,0.1);
		pointer-events: none;
	}

	.game-content {
		width: 90%;
		height: 90%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--text-table);
	}

	.player-seat {
		position: absolute;
		transform: translate(-50%, -50%);
		z-index: 2;
		transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.seat-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.video-tile-container {
		width: 140px;
		height: 105px;
		background: #111;
		border-radius: 16px;
		border: 4px solid rgba(255,255,255,0.1);
		position: relative;
		overflow: hidden;
		box-shadow: 0 15px 30px rgba(0,0,0,0.4);
		transition: all 0.4s ease;
	}

	.player-info-bubble {
		background: var(--primary);
		color: #fff;
		padding: 0.2rem 0.8rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 700;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
		border: 2px solid rgba(255,255,255,0.1);
	}

	.is-self .video-tile-container {
		transform: scale(1.15);
		border-color: var(--accent);
		box-shadow: 0 0 30px var(--accent), 0 20px 40px rgba(0,0,0,0.5);
		z-index: 10;
	}

	@media (max-width: 768px) {
		.table-surface { width: 90%; height: 50%; }
		.video-tile-container { width: 100px; height: 75px; }
	}
</style>
