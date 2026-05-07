<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { addStream, removeStream, onPeerStream, onPeerLeave } from '$lib/engine/peer';
	import type { GameState } from '$lib/engine/types';

	interface Props {
		state: GameState;
		selfId: string;
	}

	let { state: gameState, selfId }: Props = $props();

	// ─── Local Stream ────────────────────────────────────────────────────────
	let localVideoNode: HTMLVideoElement | null = $state(null);
	let localStream: MediaStream | null = $state(null);
	let audioEnabled = $state(true);
	let videoEnabled = $state(true);

	// ─── Remote Streams ──────────────────────────────────────────────────────
	// Map of peerId -> { stream: MediaStream, status: string }
	let remoteStreams = $state(new Map<string, { stream: MediaStream, status: 'connecting' | 'live' }>());

	// We need a helper action to bind a MediaStream to a <video> element
	function srcObject(node: HTMLVideoElement, stream: MediaStream | null) {
		if (stream) {
			node.srcObject = stream;
			node.onloadedmetadata = () => {
				node.play().catch(e => console.warn('Autoplay blocked:', e));
			};
		}
		return {
			update(newStream: MediaStream | null) {
				if (node.srcObject !== newStream) {
					node.srcObject = newStream;
				}
			}
		};
	}

	let cleanupFns: Array<() => void> = [];

	let videoError = $state(false);

	onMount(async () => {
		try {
			// Optimization: Use lower resolution for P2P mesh stability
			const constraints = {
				video: { 
					width: { ideal: 320 }, 
					height: { ideal: 240 }, 
					frameRate: { ideal: 12 }, // Even lower for better mesh stability
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

			if (localVideoNode) {
				localVideoNode.srcObject = localStream;
			}
		} catch (e) {
			console.error('Failed to get user media:', e);
			videoError = true;
		}

		// Handle incoming streams
		const streamCleanup = onPeerStream((stream, peerId) => {
			remoteStreams.set(peerId, { stream, status: 'live' });
			// Force a re-render by re-assigning the map (Svelte 5 Map reactivity can be tricky)
			remoteStreams = new Map(remoteStreams);
		});

		const leaveCleanup = onPeerLeave((peerId) => {
			remoteStreams.delete(peerId);
			remoteStreams = new Map(remoteStreams);
		});

		// P2P Handshake Reinforcement: 
		// When a new peer joins, we poke our stream again to ensure they see us.
		const joinCleanup = onPeerJoin((peerId) => {
			if (localStream) {
				addStream(localStream);
			}
		});

		cleanupFns.push(streamCleanup, leaveCleanup, joinCleanup);
	});

	onDestroy(() => {
		cleanupFns.forEach((fn) => fn());
		if (localStream) {
			removeStream(localStream);
			localStream.getTracks().forEach((t) => t.stop());
		}
	});

	// Helper to determine if a player is asleep (only during game night phase)
	function isAsleep(peerId: string): boolean {
		if (gameState.phase !== 'playing') return false;
		const data = gameState.game.data as any;
		if (!data || !data.sleepingPeers) return false;
		return data.sleepingPeers.includes(peerId);
	}
...
	<!-- Remote Peers -->
	{#each Array.from(remoteStreams.entries()) as [peerId, data] (peerId)}
		<div class="video-container" class:sleeping={isAsleep(peerId)}>
			<video
				use:srcObject={data.stream}
				autoPlay
				playsInline
				class="video-el"
			></video>

			{#if data.status === 'connecting'}
				<div class="video-status">Connecting...</div>
			{/if}

			<div class="nametag">
				{gameState.players[peerId]?.name || 'Unknown'}
				{isAsleep(peerId) ? '💤' : ''}
			</div>
		</div>
	{/each}

<style>
	.video-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--min-video-width, 140px), 1fr));
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 16px;
		transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	/* When game starts, video grid becomes smaller and horizontal at the top */
	.video-grid.is-playing {
		padding: 0.5rem;
		grid-column: 1 / -1;
		gap: 0.5rem;
	}

	.video-container {
		position: relative;
		border-radius: 10px;
		overflow: hidden;
		aspect-ratio: 4/3;
		background: #111;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: filter 0.5s ease;
	}

	.video-container.local {
		border-color: rgba(255, 200, 100, 0.3);
	}

	.video-el {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transform: scaleX(-1); /* Mirror effect */
	}

	.nametag {
		position: absolute;
		bottom: 0.35rem;
		left: 0.35rem;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
		color: #fff;
		pointer-events: none;
		max-width: calc(100% - 0.7rem);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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

	.video-error-hint {
		grid-column: 1 / -1;
		background: rgba(240, 96, 96, 0.1);
		border-color: rgba(240, 96, 96, 0.3);
		padding: 1rem;
		font-size: 0.85rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.video-container.local:hover .local-controls {
		opacity: 1;
	}

	/* Always show controls if something is off */
	.video-container.local:has(.media-btn.off) .local-controls {
		opacity: 1;
	}

	.media-btn {
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
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
		transition: all 0.2s ease;
	}

	.media-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		transform: scale(1.05);
	}

	.media-btn.off {
		background: rgba(240, 96, 96, 0.8);
		border-color: transparent;
	}

	/* Cheese Thief Night Phase Blur */
	.video-container.sleeping .video-el {
		filter: blur(15px) grayscale(50%) brightness(0.7);
	}
</style>
