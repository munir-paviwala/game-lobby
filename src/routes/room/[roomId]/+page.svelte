<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	import {
		joinRoom,
		leaveRoom,
		selfId,
		onMessage,
		onPeerJoin,
		onPeerLeave,
		addStream,
		broadcast,
		sendWelcome,
		broadcastStateSync,
		sendAction
	} from '$lib/engine/peer';

	import { gameState, applyAction, syncState, playerList, resetState, isPlaying } from '$lib/engine/stateStore';
	import { listGames, getGame } from '$lib/games/registry';
	import {
		playerName,
		isHost,
		hostPeerId,
		roomMeta,
		saveSession,
		clearSession
	} from '$lib/engine/session';

	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import RoomCode from '$lib/components/RoomCode.svelte';
	import VideoGrid from '$lib/components/VideoGrid.svelte';
	import GameTable from '$lib/components/GameTable.svelte';
	
	import type { PageData } from './$types';
	import type { PeerMessage, Action } from '$lib/engine/types';

	// ─── Props ────────────────────────────────────────────────────────────────
	interface Props { data: PageData; }
	let { data }: Props = $props();
	const roomId = $derived(data.roomId);

	// ─── Local state ─────────────────────────────────────────────────────────
	let connectionStatus = $state<'connecting' | 'connected' | 'error'>('connecting');
	let errorMsg = $state('');
	let selfPeerId = $state('');
	let hasJoined = $state(false);
	let loadingJoin = $state(false);
	let videoGrid: any = $state(null);
	let remoteStreams = $state(new Map<string, { stream: MediaStream, status: 'connecting' | 'live' }>());
	let localStream = $state<MediaStream | null>(null);
	let audioEnabled = $state(true);
	let videoEnabled = $state(true);


	// Handshake state
	let handshakeInterval: any = null;
	let receivedWelcome = $state(false);

	// ─── Lifecycle ────────────────────────────────────────────────────────────
	let cleanupFns: Array<() => void> = [];


	onMount(async () => {
		if (!$playerName || !$roomMeta) {
			goto(`${base}/lobby/`);
			return;
		}

		// Initial "connection" is just loading the local preview
		connectionStatus = 'connected';
	});

	async function handleJoinRoom() {
		try {
			loadingJoin = true;
			await joinRoom(roomId);
			selfPeerId = selfId();

			// Share our stream that was already initialized in pre-join
			const stream = videoGrid?.getStream();
			if (stream) {
				addStream(stream);
			}

			// Register event handlers
			cleanupFns.push(
				onMessage(handleMessage),
				onPeerJoin(handlePeerJoin),
				onPeerLeave(handlePeerLeave)
			);

			if ($isHost) {
				const meta = $roomMeta;
				roomMeta.update((m) => m ? { ...m, hostId: selfPeerId } : m);
				saveSession();

				applyAction({
					type: 'PLAYER_JOIN',
					payload: { id: selfPeerId, name: $playerName, isHost: true, joinedAt: Date.now() }
				});
				hostPeerId.set(selfPeerId);
				receivedWelcome = true;
			} else {
				// START HANDSHAKE HEARTBEAT
				handshakeInterval = setInterval(() => {
					if (!receivedWelcome) {
						console.log('[P2P] Pulsing ANNOUNCE...');
						// Use the top-level broadcast import, not dynamic import
						broadcast({
							kind: 'ANNOUNCE',
							name: $playerName,
							passwordHash: $roomMeta?.passwordHash ?? null
						});
					} else {
						if (handshakeInterval) clearInterval(handshakeInterval);
					}
				}, 2000);
			}

			hasJoined = true;
		} catch (e: any) {
			console.error('Join room failed:', e);
			connectionStatus = 'error';
			errorMsg = `Connection failed: ${e.message || 'Unknown error'}. Check console for details.`;
		} finally {
			loadingJoin = false;
		}
	}

	onDestroy(() => {
		if (handshakeInterval) clearInterval(handshakeInterval);
		cleanupFns.forEach((fn) => fn());
		leaveRoom();
	});

	// ─── Message handlers ─────────────────────────────────────────────────────

	function handleMessage(msg: PeerMessage, peerId: string) {
		switch (msg.kind) {
			case 'ANNOUNCE': {
				// Only the host processes ANNOUNCE messages
				if (!$isHost) return;
				console.log(`[P2P] Received ANNOUNCE from ${peerId} (${msg.name})`);

				// Validate password if room is password-protected
				const meta = $roomMeta;
				if (meta?.passwordHash && msg.passwordHash !== meta.passwordHash) return;

				// If player already in state, just re-send welcome (retry case)
				const existing = $gameState.players[peerId];
				let newState = $gameState;
				if (!existing) {
					newState = applyAction({
						type: 'PLAYER_JOIN',
						payload: { id: peerId, name: msg.name, isHost: false, joinedAt: Date.now() }
					});
					broadcastStateSync(newState);
				}

				sendWelcome(peerId, {
					room: { ...(meta ?? { roomId, passwordHash: null, hostId: selfPeerId, gameId: null }) },
					state: newState
				});
				break;
			}

			case 'WELCOME': {
				// Only clients receive WELCOME
				if ($isHost || receivedWelcome) return;
				console.log(`[P2P] Received WELCOME from ${peerId} (Host)`);

				receivedWelcome = true;
				if (handshakeInterval) clearInterval(handshakeInterval);

				// Store host peer ID
				hostPeerId.set(peerId);
				roomMeta.update((m) => m ? { ...m, hostId: peerId } : m);
				saveSession();

				// Sync state from host
				syncState(msg.state);
				connectionStatus = 'connected';
				break;
			}

			case 'STATE_SYNC': {
				// Clients accept state updates from host
				if (!$isHost) {
					syncState(msg.state);
				}
				break;
			}

			case 'ACTION': {
				// Host processes actions from clients
				if (!$isHost) return;
				const newState = applyAction({ ...msg.action, senderId: peerId });
				broadcastStateSync(newState);
				break;
			}
		}
	}

	function handlePeerJoin(peerId: string) {
		if ($isHost) {
			// Wait for their ANNOUNCE — handled in handleMessage
			return;
		}
		// Clients don't need to react to raw peer joins
	}

	function handlePeerLeave(peerId: string) {
		if (!$isHost) return;

		// Remove player from state
		const newState = applyAction({
			type: 'PLAYER_LEAVE',
			payload: { playerId: peerId }
		});
		broadcastStateSync(newState);
	}

	// ─── Leave room ────────────────────────────────────────────────────────────
	function handleLeave() {
		if (handshakeInterval) clearInterval(handshakeInterval);
		leaveRoom();
		resetState();
		clearSession();
		goto(`${base}/`);
	}

	// ─── Host Actions ──────────────────────────────────────────────────────────
	function handleStartGame() {
		applyAction({ type: 'START_GAME', payload: {} });
		broadcastStateSync($gameState);
	}

	function handleSetGame(gameId: string) {
		applyAction({ type: 'HOST_SET_GAME', payload: { gameId } });
		broadcastStateSync($gameState);
	}

	function handleGameAction(action: Action) {
		if ($isHost) {
			const actionWithSender = { ...action, senderId: selfPeerId };
			const newState = applyAction(actionWithSender);
			broadcastStateSync(newState);
		} else {
			sendAction($hostPeerId, action);
		}
	}


</script>

<svelte:head>
	<title>Room {roomId} — Game Lobby</title>
	<meta name="description" content="Game room {roomId} — waiting for players to join." />
</svelte:head>

<main class="room-page">
	<div class="room-blob" aria-hidden="true"></div>

	<!-- Header -->
	<header class="room-header" class:is-playing={$isPlaying}>
		<div class="brand">🎲 Game Lobby</div>
		<RoomCode {roomId} />
		<button class="btn-ghost leave-btn" id="btn-leave-room" onclick={handleLeave}>Leave</button>
	</header>

	<!-- Main content -->
	<div class="room-body" class:pre-join={!hasJoined} class:is-playing={$isPlaying}>
		<!-- Status / connecting -->
		{#if connectionStatus === 'connecting'}
			<div class="status-card card" role="status">
				<div class="status-spinner"></div>
				<p>Setting up room <strong>{roomId}</strong>…</p>
			</div>

		{:else if connectionStatus === 'error'}
			<div class="status-card card error" role="alert">
				<span class="status-icon">⚠️</span>
				<p>{errorMsg}</p>
				<button class="btn-primary" onclick={() => goto(`${base}/lobby/`)}>Back to Lobby</button>
			</div>

		{:else}
			<VideoGrid 
				bind:this={videoGrid} 
				state={$gameState} 
				selfId={selfPeerId} 
				mode={$isPlaying ? 'headless' : 'grid'}
				bind:remoteStreams
				bind:localStream
				bind:audioEnabled
				bind:videoEnabled
			/>

			{#if !hasJoined}
				<section class="pre-join-card card">
					<h2>Ready to join?</h2>
					<p>Check your camera and microphone above, then jump into the room.</p>
					
					<div class="player-preview">
						<span class="preview-name">Joining as <strong>{$playerName}</strong></span>
					</div>

					<button 
						class="btn-primary join-btn-large" 
						onclick={handleJoinRoom}
						disabled={loadingJoin}
					>
						{#if loadingJoin}
							<span class="spinner"></span> Joining...
						{:else}
							Join Room →
						{/if}
					</button>
				</section>
			{:else if !$isPlaying}
				<!-- Players panel -->
				<section class="players-panel card" aria-label="Players in room">
					<div class="panel-header">
						<h2 class="panel-title">Players</h2>
						<span class="player-count">{$playerList.length}</span>
					</div>

					<div class="players-grid">
						{#each $playerList as player (player.id)}
							<PlayerCard 
								player={player} 
								score={$gameState.scores[player.id] ?? 0}
								isSelf={player.id === selfPeerId} 
								isHostPerspective={$isHost}
								onScoreChange={(playerId, delta) => {
									const newState = applyAction({ 
										type: 'ADD_POINTS', 
										payload: { points: { [playerId]: delta } } 
									});
									broadcastStateSync(newState);
								}}
							/>
						{/each}

						{#if $playerList.length === 0}
							<p class="empty-hint">Waiting for players to join…</p>
						{/if}
					</div>
				</section>

				<!-- Game controls (host only) -->
				{#if $isHost}
					<section class="host-controls card" aria-label="Host controls">
						<div class="panel-header">
							<h2 class="panel-title">Host Controls</h2>
							<span class="host-badge">You're the Host</span>
						</div>

						<p class="host-hint">
							Share the room code above with friends. Once everyone has joined, start a game.
						</p>

						<div class="field">
							<label for="game-picker">Select Game</label>
							<select 
								id="game-picker" 
								class="game-select"
								value={$gameState.game.id ?? ''}
								onchange={(e) => handleSetGame(e.currentTarget.value)}
								title="Pick a game to play"
							>
								<option value="" disabled>-- Pick a game --</option>
								{#each listGames() as game}
									<option value={game.id}>{game.emoji} {game.name}</option>
								{/each}
							</select>
							{#if $gameState.game.id}
								{@const selectedGame = getGame($gameState.game.id)}
								<p class="game-description" transition:fade>
									{selectedGame?.description} 
									<span class="player-range">({selectedGame?.minPlayers}-{selectedGame?.maxPlayers} players)</span>
								</p>
							{/if}
						</div>

						<button
							class="btn-primary start-btn"
							id="btn-start-game"
							disabled={!$gameState.game.id || $playerList.length < (getGame($gameState.game.id!)?.minPlayers ?? 2)}
							onclick={handleStartGame}
							title={!$gameState.game.id ? 'Pick a game first' : $playerList.length < (getGame($gameState.game.id!)?.minPlayers ?? 2) ? `Need at least ${getGame($gameState.game.id!)?.minPlayers} players` : 'Start the game!'}
						>
							{!$gameState.game.id ? 'Pick a game first' : $playerList.length < (getGame($gameState.game.id!)?.minPlayers ?? 2) ? `Waiting for players… (${$playerList.length}/${getGame($gameState.game.id!)?.minPlayers})` : 'Start Game →'}
						</button>
					</section>
				{:else}
					<!-- Non-host waiting view -->
					<section class="waiting-panel card" aria-label="Waiting for host">
						<div class="waiting-icon" aria-hidden="true">⏳</div>
						<h2>Waiting for the host to start…</h2>
						<p class="host-hint">The host will pick a game and kick things off.</p>
					</section>
				{/if}
			{/if}
		{/if}

		<!-- Active Game Component -->
		{#if $isPlaying && $gameState.game.id}
			<GameTable 
				state={$gameState} 
				selfId={selfPeerId} 
				{remoteStreams} 
				{localStream}
				bind:audioEnabled
				bind:videoEnabled
			>
				{@const ActiveGame = getGame($gameState.game.id)?.component}
				{#if ActiveGame}
					<ActiveGame
						state={$gameState}
						isHost={$isHost}
						selfId={selfPeerId}
						onAction={handleGameAction}
					/>
				{/if}
			</GameTable>
		{/if}
	</div>
</main>



<style>
	.room-page {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		position: relative;
	}

	.room-blob {
		position: fixed;
		width: 600px;
		height: 600px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(124, 106, 247, 0.12), transparent 70%);
		filter: blur(80px);
		top: 0;
		right: -100px;
		pointer-events: none;
		z-index: 0;
	}

	/* Header */
	.room-header {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.5rem;
		flex-wrap: wrap;
		transition: all var(--transition-md);
	}

	.room-header.is-playing {
		padding: 0.5rem 1rem;
		background: rgba(13, 13, 20, 0.4);
	}

	.room-header.is-playing .brand {
		font-size: 0.8rem;
		opacity: 0.5;
	}

	.brand {
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
		flex-shrink: 0;
	}

	.leave-btn {
		margin-left: auto;
		padding: 0.45rem 0.9rem;
		font-size: 0.85rem;
		color: var(--color-danger);
		border-color: rgba(240, 96, 96, 0.3);
	}

	.leave-btn:hover {
		background: rgba(240, 96, 96, 0.1) !important;
	}

	/* Body */
	.room-body {
		position: relative;
		z-index: 1;
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		padding: 1.5rem;
		max-width: 900px;
		transition: max-width var(--transition-slow);
		margin: 0 auto;
		width: 100%;
		align-content: start;
	}

	.room-body.is-playing {
		max-width: 1800px;
		display: flex;
		flex-direction: column;
		padding: 0.5rem;
	}

	@media (max-width: 640px) {
		.room-body {
			grid-template-columns: 1fr;
		}
	}

	.room-body.pre-join {
		grid-template-columns: 1fr;
		max-width: 500px;
	}

	.video-wrapper {
		grid-column: 1 / -1;
	}

	.pre-join-card {
		padding: 2.5rem 2rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		animation: slide-up 0.4s ease-out;
	}

	@keyframes slide-up {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.join-btn-large {
		padding: 1.25rem;
		font-size: 1.25rem;
		width: 100%;
	}

	.player-preview {
		background: rgba(255, 255, 255, 0.05);
		padding: 0.75rem;
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
	}

	/* Status cards */
	.status-card {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 2rem;
		text-align: center;
	}

	.status-card.error {
		border-color: rgba(240, 96, 96, 0.3);
	}

	.status-spinner {
		width: 2.5rem;
		height: 2.5rem;
		border: 3px solid rgba(124, 106, 247, 0.2);
		border-top-color: var(--color-accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.status-icon {
		font-size: 2rem;
	}

	/* Panel shared styles */
	.players-panel,
	.host-controls,
	.waiting-panel {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.panel-title {
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
	}

	.player-count {
		background: rgba(124, 106, 247, 0.2);
		color: var(--color-accent-light);
		font-size: 0.8rem;
		font-weight: 700;
		border-radius: 20px;
		padding: 0.15rem 0.55rem;
	}

	.host-badge {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-gold);
		background: rgba(240, 180, 41, 0.15);
		border-radius: 6px;
		padding: 0.2rem 0.5rem;
	}

	/* Player list */
	.players-grid {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.empty-hint {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		text-align: center;
		padding: 1.5rem 0;
	}

	/* Host controls */
	.host-hint {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		line-height: 1.6;
	}

	.start-btn {
		width: 100%;
		padding: 0.875rem;
		font-size: 1rem;
		margin-top: 0.5rem;
	}

	.game-select {
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		font-size: 1rem;
		outline: none;
		cursor: pointer;
		appearance: none;
	}
	
	.game-select:focus {
		border-color: var(--color-accent);
	}

	.game-select option {
		background: var(--bg-card);
		color: var(--color-text);
	}

	.game-description {
		margin-top: 0.75rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		line-height: 1.5;
		background: rgba(255, 255, 255, 0.03);
		padding: 0.75rem;
		border-radius: var(--radius-sm);
		border-left: 2px solid var(--color-accent);
	}

	.player-range {
		display: block;
		margin-top: 0.25rem;
		font-weight: 600;
		color: var(--color-accent-light);
		font-size: 0.75rem;
	}

	/* Waiting panel */
	.waiting-panel {
		align-items: center;
		text-align: center;
		justify-content: center;
	}

	.waiting-icon {
		font-size: 2.5rem;
	}

	.waiting-panel h2 {
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
	}
</style>
