<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { addStream, removeStream, onPeerStream, onPeerLeave, onPeerJoin } from '$lib/engine/peer';
	import type { GameState } from '$lib/engine/types';
	import VideoTile from './VideoTile.svelte';

	interface Props {
		state: GameState;
		selfId: string;
		mode?: 'grid' | 'headless';
		localStream?: MediaStream | null;
		remoteStreams?: Map<string, { stream: MediaStream, status: 'connecting' | 'live' }>;
		audioEnabled?: boolean;
		videoEnabled?: boolean;
		/** If true, skip getUserMedia entirely (useful when hosting via external call like GMeet) */
		noVideo?: boolean;
	}

	let { 
		state: gameState, 
		selfId, 
		mode = 'grid',
		localStream = $bindable(null),
		remoteStreams = $bindable(new Map()),
		audioEnabled = $bindable(true),
		videoEnabled = $bindable(true),
		noVideo = false
	}: Props = $props();

	let videoError = $state(false);
	let cleanupFns: Array<() => void> = [];

	// Whether video should be shown at all (respects both the local opt-out and the host's global toggle)
	const videoMode = $derived(gameState.videoMode ?? 'on');

	onMount(async () => {
		if (!noVideo) {
			try {
				const constraints = {
					video: { 
						width: { ideal: 320 }, 
						height: { ideal: 240 }, 
						frameRate: { ideal: 12 }, 
						facingMode: 'user' 
					},
					audio: {
						echoCancellation: true,
						noiseSuppression: true
					}
				};
				
				try {
					localStream = await navigator.mediaDevices.getUserMedia(constraints);
				} catch (firstErr) {
					console.warn('Optimized constraints failed, trying basic...', firstErr);
					localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
				}

				// Apply initial state
				localStream.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
				localStream.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));

			} catch (e) {
				console.error('Failed to get user media:', e);
				videoError = true;
			}
		}

		// Handle incoming streams
		cleanupFns.push(
			onPeerStream((stream, peerId) => {
				remoteStreams.set(peerId, { stream, status: 'live' });
				remoteStreams = new Map(remoteStreams);
			}),
			onPeerLeave((peerId) => {
				remoteStreams.delete(peerId);
				remoteStreams = new Map(remoteStreams);
			}),
			onPeerJoin((peerId) => {
				if (localStream) addStream(localStream);
			})
		);
	});

	$effect(() => {
		if (localStream) {
			localStream.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
		}
	});

	$effect(() => {
		if (localStream) {
			localStream.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
		}
	});

	onDestroy(() => {
		cleanupFns.forEach((fn) => fn());
		if (localStream) {
			removeStream(localStream);
			localStream.getTracks().forEach((t) => t.stop());
		}
	});

	function toggleAudio() { audioEnabled = !audioEnabled; }
	function toggleVideo() { videoEnabled = !videoEnabled; }

	function isAsleep(peerId: string): boolean {
		if (gameState.phase !== 'playing') return false;
		const data = gameState.game.data as any;
		return data?.sleepingPeers?.includes(peerId) ?? false;
	}

	export function getStream() { return localStream; }
</script>

{#if mode === 'grid'}
	<div class="video-grid" class:is-playing={gameState.phase === 'playing'}>
		{#if videoMode === 'off'}
			<div class="video-mode-banner">📵 Video feeds hidden by host</div>
		{/if}
		{#if videoError && !noVideo}
			<div class="video-error-hint">
				<p>Unable to access camera/mic.</p>
				<button class="btn-ghost" onclick={() => window.location.reload()}>Retry</button>
			</div>
		{/if}

		<!-- Local User -->
		<div class="video-container local" class:sleeping={isAsleep(selfId)}>
			<VideoTile 
				stream={videoMode === 'off' || noVideo ? null : localStream} 
				peerId={selfId} 
				isSelf={true} 
				isAsleep={isAsleep(selfId)} 
				name="{gameState.players[selfId]?.name || 'You'}" 
				onToggleAudio={toggleAudio}
				onToggleVideo={toggleVideo}
			/>
		</div>

		<!-- Remote Peers -->
		{#each Array.from(remoteStreams.entries()) as [peerId, data] (peerId)}
			<div class="video-container" class:sleeping={isAsleep(peerId)}>
				<VideoTile 
					stream={videoMode === 'off' ? null : data.stream} 
					peerId={peerId} 
					isAsleep={isAsleep(peerId)} 
					name={gameState.players[peerId]?.name || 'Unknown'} 
				/>
				{#if data.status === 'connecting' && videoMode !== 'off'}
					<div class="video-status">Connecting...</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.video-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--min-video-width, 140px), 1fr));
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 16px;
	}

	.video-grid.is-playing {
		display: none; /* Hide grid when game table is active */
	}

	.video-container {
		position: relative;
		border-radius: 10px;
		overflow: hidden;
		aspect-ratio: 4/3;
		background: #111;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.video-container.local {
		border-color: rgba(255, 200, 100, 0.3);
	}


	.video-status {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: rgba(0,0,0,0.5);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
	}

	.video-mode-banner {
		grid-column: 1 / -1;
		text-align: center;
		font-size: 0.78rem;
		color: rgba(255, 200, 100, 0.8);
		background: rgba(255, 180, 50, 0.08);
		border: 1px solid rgba(255, 180, 50, 0.2);
		border-radius: 8px;
		padding: 0.5rem 1rem;
		letter-spacing: 0.02em;
	}
</style>
