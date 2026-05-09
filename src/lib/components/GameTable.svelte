<script lang="ts">
	import type { GameState, Player, GameTheme } from '$lib/engine/types';
	import { getGame } from '$lib/games/registry';
	import VideoTile from './VideoTile.svelte';

	interface Props {
		state: GameState;
		selfId: string;
		remoteStreams: Map<string, { stream: MediaStream, status: 'connecting' | 'live' }>;
		localStream: MediaStream | null;
		audioEnabled: boolean;
		videoEnabled: boolean;
		children?: any;
	}

	let { 
		state, 
		selfId, 
		remoteStreams, 
		localStream, 
		audioEnabled = $bindable(true),
		videoEnabled = $bindable(true),
		children 
	}: Props = $props();

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
		const a = 48; 
		const b = 44;
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
	<div class="table-surface-outer">
		<div class="table-surface">
			<div class="inner-glow"></div>
			<div class="game-content">
				{@render children?.()}
			</div>
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
				<div class="video-tile-container" class:asleep={isAsleep(player.id)}>
					<VideoTile 
						{stream} 
						peerId={player.id} 
						isSelf={player.id === selfId} 
						isAsleep={isAsleep(player.id)} 
						name={player.name} 
						onToggleAudio={(e) => { if (player.id === selfId) audioEnabled = e; }}
						onToggleVideo={(e) => { if (player.id === selfId) videoEnabled = e; }}
					/>
				</div>
				<div class="player-info-bubble">
					<span class="p-name-small">{player.name}</span>
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
		height: 90vh;
		min-height: 400px;
		max-height: 1200px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
		perspective: 1000px;
	}

	.table-surface-outer {
		width: 85%;
		height: 75%;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		transform: rotateX(15deg);
		z-index: 1;
	}

	.table-surface {
		position: relative;
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, var(--bg-table) 0%, rgba(15, 23, 42, 0.95) 100%);
		border-radius: 300px / 200px;
		box-shadow: 
			0 40px 100px rgba(0,0,0,0.6),
			0 0 0 10px rgba(255,255,255,0.03),
			inset 0 0 80px rgba(0,0,0,0.4);
		border: 2px solid rgba(255,255,255,0.08);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.inner-glow {
		position: absolute;
		inset: 20px;
		border-radius: inherit;
		box-shadow: inset 0 0 40px var(--primary);
		opacity: 0.15;
		pointer-events: none;
	}

	.game-content {
		width: 85%;
		height: 80%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--text-table);
		z-index: 5;
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
		width: 160px;
		height: 120px;
		background: #111;
		border-radius: 20px;
		border: 3px solid rgba(255,255,255,0.08);
		position: relative;
		overflow: hidden;
		box-shadow: 0 20px 40px rgba(0,0,0,0.5);
		transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.video-tile-container.asleep {
		transform: scale(0.9);
		opacity: 0.8;
		border-color: rgba(255, 255, 255, 0.05);
	}

	.player-info-bubble {
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: #fff;
		padding: 0.35rem 0.8rem;
		border-radius: 30px;
		font-size: 0.8rem;
		font-weight: 600;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
		border: 1px solid rgba(255,255,255,0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 100px;
	}

	.p-name-small {
		font-size: 0.7rem;
		opacity: 0.6;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.score {
		font-weight: 800;
		color: var(--color-gold, #f0b429);
	}

	.is-self .video-tile-container {
		transform: scale(1.2);
		border-color: var(--accent);
		box-shadow: 
			0 0 40px var(--color-accent-glow),
			0 25px 50px rgba(0,0,0,0.6);
		z-index: 10;
	}

	.is-self .player-info-bubble {
		background: var(--accent);
		border-color: rgba(255,255,255,0.2);
		transform: translateY(-5px);
	}

	.is-self .score {
		color: #fff;
	}

	@media (max-width: 1024px) {
		.table-surface-outer { width: 90%; height: 65%; }
		.video-tile-container { width: 130px; height: 98px; }
	}

	@media (max-width: 768px) {
		.table-surface-outer { width: 95%; height: 60%; }
		.video-tile-container { width: 100px; height: 75px; }
		.player-info-bubble { min-width: 80px; padding: 0.2rem 0.5rem; }
	}

	@media (max-width: 480px) {
		.table-surface-outer { 
			width: 98%; 
			height: 65%; 
			transform: rotateX(5deg); 
		}
		.video-tile-container { width: 80px; height: 60px; border-radius: 10px; }
		.player-info-bubble { font-size: 0.6rem; min-width: 60px; padding: 0.15rem 0.3rem; }
		.game-table { min-height: 500px; height: 80vh; }
	}
</style>
