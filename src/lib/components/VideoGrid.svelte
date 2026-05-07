<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { addStream, removeStream, onPeerStream, onPeerLeave, onPeerJoin } from '$lib/engine/peer';
	import type { GameState } from '$lib/engine/types';
	import VideoTile from './VideoTile.svelte';

	interface Props {
		state: GameState;
		selfId: string;
		mode?: 'grid' | 'headless';
	}

	let { state: gameState, selfId, mode = 'grid' }: Props = $props();

	// ─── Local Stream ────────────────────────────────────────────────────────
	export let localStream: MediaStream | null = $state(null);
	let audioEnabled = $state(true);
	let videoEnabled = $state(true);
	let videoError = $state(false);

	// ─── Remote Streams ──────────────────────────────────────────────────────
	// Map of peerId -> { stream: MediaStream, status: string }
	export let remoteStreams = $state(new Map<string, { stream: MediaStream, status: 'connecting' | 'live' }>());

	let cleanupFns: Array<() => void> = [];

	onMount(async () => {
		try {
			// Optimization: Use lower resolution for P2P mesh stability
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
		} catch (e) {
			console.error('Failed to get user media:', e);
			videoError = true;
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

	onDestroy(() => {
		cleanupFns.forEach((fn) => fn());
		if (localStream) {
			removeStream(localStream);
			localStream.getTracks().forEach((t) => t.stop());
		}
	});

	function toggleAudio() {
		if (localStream) {
			audioEnabled = !audioEnabled;
			localStream.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
		}
	}

	function toggleVideo() {
		if (localStream) {
			videoEnabled = !videoEnabled;
			localStream.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
		}
	}

	function isAsleep(peerId: string): boolean {
		if (gameState.phase !== 'playing') return false;
		const data = gameState.game.data as any;
		return data?.sleepingPeers?.includes(peerId) ?? false;
	}

	export function getStream() { return localStream; }
</script>

{#if mode === 'grid'}
	<div class="video-grid" class:is-playing={gameState.phase === 'playing'}>
		{#if videoError}
			<div class="video-error-hint">
				<p>Unable to access camera/mic.</p>
				<button class="btn-ghost" onclick={() => window.location.reload()}>Retry</button>
			</div>
		{/if}

		<!-- Local User -->
		<div class="video-container local" class:sleeping={isAsleep(selfId)}>
			<VideoTile 
				stream={localStream} 
				peerId={selfId} 
				isSelf={true} 
				isAsleep={isAsleep(selfId)} 
				name="{gameState.players[selfId]?.name || 'You'}" 
			/>

			<div class="local-controls">
				<button 
					class="media-btn" 
					class:off={!audioEnabled}
					onclick={toggleAudio}
				>
					{audioEnabled ? '🎤' : '🔇'}
				</button>
				<button 
					class="media-btn" 
					class:off={!videoEnabled}
					onclick={toggleVideo}
				>
					{videoEnabled ? '📷' : '🚫'}
				</button>
			</div>
		</div>

		<!-- Remote Peers -->
		{#each Array.from(remoteStreams.entries()) as [peerId, data] (peerId)}
			<div class="video-container" class:sleeping={isAsleep(peerId)}>
				<VideoTile 
					stream={data.stream} 
					peerId={peerId} 
					isAsleep={isAsleep(peerId)} 
					name={gameState.players[peerId]?.name || 'Unknown'} 
				/>
				{#if data.status === 'connecting'}
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

	.local-controls {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		gap: 0.35rem;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.video-container.local:hover .local-controls {
		opacity: 1;
	}

	.media-btn {
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.media-btn.off {
		background: rgba(240, 96, 96, 0.8);
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
</style>
