<script lang="ts">
	import type { Player } from '$lib/engine/types';

	interface Props {
		player: Player;
		score?: number;
		isSelf?: boolean;
		isHostPerspective?: boolean;
		onScoreChange?: (playerId: string, delta: number) => void;
	}

	let { player, score = 0, isSelf = false, isHostPerspective = false, onScoreChange }: Props = $props();

	// Generate a stable pastel color from the player's name
	function nameColor(name: string): string {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		const h = Math.abs(hash) % 360;
		return `hsl(${h}, 60%, 65%)`;
	}

	const color = $derived(nameColor(player.name));
	const initials = $derived(
		player.name
			.split(' ')
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	);
</script>

<div class="player-card" class:self={isSelf} class:host={player.isHost}>
	<div class="avatar" style:background-color={color}>
		{initials}
	</div>
	<div class="info">
		<span class="name">{player.name}{isSelf ? ' (you)' : ''}</span>
		{#if player.isHost}
			<span class="badge host-badge">Host</span>
		{/if}
	</div>
	<div class="score-container">
		{#if isHostPerspective && onScoreChange}
			<button class="score-btn" onclick={() => onScoreChange(player.id, -1)} title="Subtract point">-</button>
		{/if}
		<div class="score">{score} pts</div>
		{#if isHostPerspective && onScoreChange}
			<button class="score-btn" onclick={() => onScoreChange(player.id, 1)} title="Add point">+</button>
		{/if}
	</div>
</div>

<style>
	.player-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.player-card.self {
		border-color: rgba(255, 200, 100, 0.4);
		background: rgba(255, 200, 100, 0.07);
	}

	.avatar {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.875rem;
		color: rgba(0, 0, 0, 0.7);
		flex-shrink: 0;
	}

	.info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.name {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-text, #e8e8f0);
	}

	.badge {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-radius: 4px;
		padding: 0.1em 0.4em;
		width: fit-content;
	}

	.host-badge {
		background: rgba(255, 180, 50, 0.2);
		color: #ffb932;
	}

	.score-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.score {
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.6);
		min-width: 3ch;
		text-align: center;
	}

	.score-btn {
		background: rgba(255, 255, 255, 0.1);
		border: none;
		color: #fff;
		width: 24px;
		height: 24px;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		transition: background 0.2s ease;
	}

	.score-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
